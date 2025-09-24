"""
Inicializa el servidor API, carga la Base de Datos y añade los Endpoints
"""
import os
import datetime
from decimal import Decimal

from flask import request, jsonify, Blueprint
from flask_cors import CORS
from werkzeug.utils import secure_filename
from supabase import create_client, Client

from api.models import FavoritesSpaces, SpaceImages, db, User, Space, Booking, Payment
from api.utils import APIException, generate_sitemap

from flask_jwt_extended import (
    create_access_token, jwt_required, get_jwt_identity
)
from werkzeug.security import generate_password_hash, check_password_hash

# Email
from flask_mail import Message
import secrets

# ------------------------------------------------------------------------------
# Config / clientes externos
# ------------------------------------------------------------------------------
FRONTEND_URL = os.getenv(
    "VITE_FRONTEND_URL",
    "https://improved-memory-wrp447q9x9w39vvw-3000.app.github.dev",
)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY") or ""
if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY/SUPABASE_KEY en .env")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# buckets
USER_BUCKET = "userImages"
POST_BUCKET = "postImages"

# Registrar blueprint
api = Blueprint("api", __name__)
CORS(api)

# ------------------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------------------
def _upload_public_to_supabase(bucket: str, key: str, data: bytes, content_type=None) -> str:
    """
    Sube `data` al bucket/`key` en Supabase y devuelve la URL pública.
    Lanza excepción si falla.
    """
    try:
        print(f"[DEBUG] Intentando subir a Supabase: bucket={bucket}, key={key}, size={len(data)}")
        
        # Verificar que Supabase esté configurado
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise RuntimeError("Configuración de Supabase incompleta: URL o KEY faltante")
        
        file_options = {}
        if content_type:
            file_options["contentType"] = content_type
        
        print(f"[DEBUG] File options: {file_options}")

        # Intentar subir el archivo
        res = supabase.storage.from_(bucket).upload(
            path=key,
            file=data,
            file_options=file_options
        )
        
        print(f"[DEBUG] Respuesta de upload: {res}")

        # Verificar resultado - manejar diferentes formatos de respuesta
        if hasattr(res, 'error') and res.error:
            raise RuntimeError(f"Upload error: {res.error}")
        elif isinstance(res, dict):
            if 'error' in res and res['error']:
                raise RuntimeError(f"Upload error: {res['error']}")
            elif 'path' not in res:
                raise RuntimeError(f"Upload response missing path: {res}")
        
        # Obtener URL pública
        public_url = supabase.storage.from_(bucket).get_public_url(key)
        print(f"[DEBUG] URL pública generada: {public_url}")
        
        return public_url
        
    except Exception as e:
        print(f"[ERROR] Error en _upload_public_to_supabase: {str(e)}")
        print(f"[ERROR] Tipo de error: {type(e)}")
        raise e


def _now_key(prefix: str, original_name: str) -> str:
    base, ext = os.path.splitext(original_name or "")
    base = secure_filename(base) or "file"
    ext = (ext or ".jpg").lower()
    ts = datetime.datetime.utcnow().strftime("%Y%m%d%H%M%S%f")
    return f"{prefix}/{ts}-{base}{ext}"


# ------------------------------------------------------------------------------
# Debug endpoint para verificar configuración de Supabase
# ------------------------------------------------------------------------------
@api.route("/debug/supabase", methods=["GET"])
def debug_supabase():
    """Endpoint para verificar la configuración de Supabase (solo en desarrollo)"""
    try:
        return jsonify({
            "supabase_url_configured": bool(SUPABASE_URL),
            "supabase_url": SUPABASE_URL[:20] + "..." if SUPABASE_URL else "No configurado",
            "supabase_key_configured": bool(SUPABASE_KEY),
            "supabase_key": SUPABASE_KEY[:10] + "..." if SUPABASE_KEY else "No configurado",
            "user_bucket": USER_BUCKET,
            "post_bucket": POST_BUCKET
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ------------------------------------------------------------------------------
# Ejemplo
# ------------------------------------------------------------------------------
@api.route("/hello", methods=["POST", "GET"])
def handle_hello():
    return jsonify({"msg": "¡Hola! Soy un mensaje del backend."}), 200


# ------------------------------------------------------------------------------
# Auth - SIGNUP
# ------------------------------------------------------------------------------
@api.route("/signup", methods=["POST"])
def signup():
    try:
        first_name = request.form.get("first_name")
        last_name  = request.form.get("last_name")
        username   = request.form.get("username")
        email      = request.form.get("email")
        password   = request.form.get("password")

        required_fields = ["first_name", "last_name", "username", "email", "password"]
        for field in required_fields:
            if not locals()[field]:
                return jsonify({"error": f"El campo '{field}' es obligatorio."}), 400

        if User.query.filter_by(email=email).first():
            return jsonify({"error": "Este correo electrónico ya está registrado."}), 400

        if User.query.filter_by(username=username).first():
            return jsonify({"error": "Este nombre de usuario ya está registrado."}), 400

        hashed_password = generate_password_hash(password)

        new_user = User(
            email=email,
            username=username,
            first_name=first_name,
            last_name=last_name,
            password=hashed_password,
            is_active=True,
        )

        db.session.add(new_user)
        db.session.flush()  # para obtener id

        # Imagen de perfil (opcional)
        image = request.files.get("profile_image")
        if image and image.filename:
            data  = image.read()
            ctype = getattr(image, "mimetype", None) or "application/octet-stream"
            key   = _now_key(str(new_user.id), image.filename)
            try:
                public_url = _upload_public_to_supabase(USER_BUCKET, key, data, ctype)
                new_user.image_url = public_url
            except Exception as e:
                db.session.rollback()
                return jsonify({"msg": "Error al subir la imagen de perfil a Supabase.", "error": str(e)}), 500

        db.session.commit()
        return jsonify({"msg": "Usuario creado correctamente", "Nuevo usuario": new_user.serialize()}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ------------------------------------------------------------------------------
# Auth - LOGIN
# ------------------------------------------------------------------------------
@api.route("/login", methods=["POST"])
def handle_login():
    try:
        data = request.get_json() or {}
        email    = data.get("email")
        password = data.get("password")

        if not email or not password:
            return jsonify({"error": "Email y contraseña son necesarios"}), 400

        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({"error": "Usuario no encontrado"}), 404

        if not check_password_hash(user.password, password):
            return jsonify({"msg": "Contraseña incorrecta"}), 401

        if not user.is_active:
            return jsonify({"error": "Usuario ha sido desactivado"}), 401

        access_token = create_access_token(
            identity=str(user.id),
            expires_delta=datetime.timedelta(hours=24)
        )

        return jsonify({"msg": "Inicio de sesión exitoso.", "access_token": access_token, "user": user.serialize()}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ------------------------------------------------------------------------------
# Auth - VERIFY TOKEN
# ------------------------------------------------------------------------------
@api.route("/verify-token", methods=["GET"])
@jwt_required()
def verify_token():
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({"msg": "Usuario no encontrado."}), 404

        return jsonify({"msg": "El token es válido.", "user_id": current_user_id}), 200
    except Exception as e:
        return jsonify({"msg": "Error al verificar el token.", "error": str(e)}), 500


# ------------------------------------------------------------------------------
# Ruta privada de prueba
# ------------------------------------------------------------------------------
@api.route("/testing-private", methods=["GET"])
@jwt_required()
def private_route():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"msg": "Usuario no encontrado."}), 404
    return jsonify({"msg": f"Welcome {user.email}!", "user": user.serialize()}), 200


# ------------------------------------------------------------------------------
# Perfil - GET
# ------------------------------------------------------------------------------
@api.route("/profile", methods=["GET"])
@jwt_required()
def get_user_private_profile():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        if not current_user:
            return jsonify({"error": "Usuario no encontrado."}), 404

        profile_data = current_user.serialize()
        profile_data.update({
            "owned_spaces_count": len(current_user.owned_spaces),
            "bookings_count":     len(current_user.bookings),
            "owned_spaces":       [s.serialize() for s in current_user.owned_spaces],
            "bookings":           [b.serialize() for b in current_user.bookings],
        })

        return jsonify({"message": "Datos de usuario encontrados", "current_user": profile_data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ------------------------------------------------------------------------------
# Perfil - PUT
# ------------------------------------------------------------------------------
@api.route("/profile", methods=["PUT"])
@jwt_required()
def update_user_private_profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Usuario no encontrado"}), 404

    # Permite JSON o multipart/form-data
    data = request.get_json(silent=True) or request.form.to_dict()
    try:
        if "first_name" in data: user.first_name = data["first_name"]
        if "last_name" in data:  user.last_name  = data["last_name"]
        if "username" in data:
            existing_user = User.query.filter(User.username == data["username"], User.id != user.id).first()
            if existing_user:
                return jsonify({"msg": "Este nombre de usuario ya está en uso."}), 400
            user.username = data["username"]
        if "email" in data:
            existing_user = User.query.filter(User.email == data["email"], User.id != user.id).first()
            if existing_user:
                return jsonify({"msg": "Este correo electrónico ya está registrado."}), 400
            user.email = data["email"]
        if "password" in data:
            if "current_password" not in data:
                return jsonify({"error": "Se necesita la contraseña actual para cambiar a nueva contraseña."}), 400
            if not check_password_hash(user.password, data["current_password"]):
                return jsonify({"error": "La contraseña actual es incorrecta."}), 400
            user.password = generate_password_hash(data["password"])

        # NUEVO: actualizar imagen de perfil si se envía
        upload_success = True
        upload_error = None
        
        image = request.files.get("profile_image")
        if image and image.filename:
            data_img  = image.read()
            ctype = getattr(image, "mimetype", None) or "application/octet-stream"
            key   = f"{user.id}/{secure_filename(image.filename)}"
            try:
                print(f"[DEBUG] Procesando imagen: filename={image.filename}, size={len(data_img)}, type={ctype}")
                public_url = _upload_public_to_supabase(USER_BUCKET, key, data_img, ctype)
                user.image_url = public_url
                print(f"[DEBUG] Imagen subida exitosamente: {public_url}")
            except Exception as e:
                print(f"[ERROR] Error al subir imagen de perfil: {str(e)}")
                upload_success = False
                upload_error = str(e)
                # No hacemos rollback, permitimos que el resto del perfil se actualice

        db.session.commit()
        
        # Preparar respuesta
        response_data = {
            "message": "Profile actualizado exitosamente.", 
            "user": user.serialize()
        }
        
        if not upload_success and upload_error:
            response_data["warning"] = f"Perfil actualizado pero error en imagen: {upload_error}"
            return jsonify(response_data), 200  # 200 porque el perfil sí se actualizó
        
        return jsonify(response_data), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "Error al actualizar perfil.", "error": str(e)}), 500


# ------------------------------------------------------------------------------
# Spaces - GET ALL / GET ONE
# ------------------------------------------------------------------------------
@api.route("/spaces", methods=["GET"])
def get_all_spaces():
    try:
        spaces = Space.query.all()
        return jsonify({"msg": "Espacios obtenidos exitosamente.", "total": len(spaces), "spaces": [s.serialize() for s in spaces]}), 200
    except Exception as e:
        return jsonify({"message": "Error al obtener espacios.", "error": str(e)}), 500


@api.route("/spaces/<int:space_id>", methods=["GET"])
def get_one_space(space_id):
    try:
        space = Space.query.get(space_id)
        if not space:
            return jsonify({"message": f"No se encontró el espacio con ID {space_id}."}), 404
        return jsonify({"msg": "Espacio obtenido exitosamente.", "space": space.serialize()}), 200
    except Exception as e:
        return jsonify({"message": "Error al obtener el espacio.", "error": str(e)}), 500


# ------------------------------------------------------------------------------
# Spaces - CREATE (acepta JSON o FormData con imágenes)
# ------------------------------------------------------------------------------
@api.route("/new-space", methods=["POST"])
@jwt_required()
def create_new_space():
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        if not user or not user.is_active:
            return jsonify({"msg": "Usuario no válido."}), 401

        # Acepta JSON o multipart/form-data
        data = request.get_json(silent=True) or request.form.to_dict()

        title        = (data.get("title") or "").strip()
        address      = (data.get("address") or data.get("direction") or "").strip()
        description  = (data.get("description") or "").strip()
        price_per_day = data.get("price_per_day")
        capacity      = data.get("capacity")
        bathrooms     = data.get("bathrooms")
        
        # Campos opcionales
        area_sqm = data.get("area_sqm")
        floor = data.get("floor") 
        available_hours = (data.get("available_hours") or "24/7").strip()
        
        # Amenidades (checkboxes)
        wifi = data.get("wifi") == "true"
        parking = data.get("parking") == "true"
        air_conditioning = data.get("air_conditioning") == "true"
        kitchen = data.get("kitchen") == "true"
        workspace = data.get("workspace") == "true"
        projector = data.get("projector") == "true"

        # Validar campos requeridos
        missing = []
        if not title: missing.append("title")
        if not address: missing.append("address")
        if not description: missing.append("description")
        if not price_per_day: missing.append("price_per_day")
        if not capacity: missing.append("capacity")
        if not bathrooms: missing.append("bathrooms")
        
        if missing:
            return jsonify({"msg": f"Faltan campos obligatorios: {', '.join(missing)}"}), 400

        try:
            price_per_day = Decimal(str(price_per_day))
            capacity = int(capacity)
            bathrooms = int(bathrooms)
            if price_per_day <= 0 or capacity <= 0 or bathrooms <= 0:
                return jsonify({"error": "price_per_day, capacity y bathrooms deben ser positivos"}), 400
        except Exception:
            return jsonify({"error": "Formato de price_per_day, capacity o bathrooms inválido"}), 400
            
        # Validar campos opcionales numéricos
        if area_sqm:
            try:
                area_sqm = int(area_sqm)
                if area_sqm <= 0:
                    area_sqm = None
            except (ValueError, TypeError):
                area_sqm = None
                
        if floor:
            try:
                floor = int(floor)
            except (ValueError, TypeError):
                floor = None

        new_space = Space(
            owner_id=current_user_id,
            title=title[:60],
            address=address[:255],
            description=description,
            price_per_day=price_per_day,
            capacity=capacity,
            bathrooms=bathrooms,
            area_sqm=area_sqm,
            floor=floor,
            available_hours=available_hours,
            wifi=wifi,
            parking=parking,
            air_conditioning=air_conditioning,
            kitchen=kitchen,
            workspace=workspace,
            projector=projector,
        )
        db.session.add(new_space)
        db.session.flush()  # obtiene ID

        # Imágenes (si llegan por multipart/form-data)
        if request.files:
            images = request.files.getlist("images") or []
            for image in images:
                if not image or not image.filename:
                    continue
                try:
                    file_bytes = image.read()
                    filename   = f"{new_space.id}/{secure_filename(image.filename)}"
                    # SOLO contentType como string
                    file_options = {
                        "contentType": str(image.mimetype or "application/octet-stream")
                    }
                    res = supabase.storage.from_(POST_BUCKET).upload(
                        filename,
                        file_bytes,
                        file_options=file_options
                        # Elimina: upsert=True
                    )
                    err = getattr(res, "error", None) or (isinstance(res, dict) and res.get("error"))
                    if err:
                        print("SUPABASE ERROR:", err)
                        return jsonify({"msg": "Error al subir imagen a Supabase.", "error": str(err)}), 500

                    public_url = supabase.storage.from_(POST_BUCKET).get_public_url(filename)
                    db.session.add(SpaceImages(space_id=new_space.id, url=public_url))
                except Exception as ex:
                    print("EXCEPTION SUBIENDO IMAGEN:", ex)
                    return jsonify({"msg": "Error al subir imagen a Supabase.", "error": str(ex)}), 500

        db.session.commit()
        return jsonify({"msg": "Espacio creado exitosamente.", "space": new_space.serialize()}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error al crear espacio.", "error": str(e)}), 500


# ------------------------------------------------------------------------------
# Espacios - UPDATE
# ------------------------------------------------------------------------------
@api.route("/space/<int:space_id>", methods=["PUT"])
@jwt_required()
def update_space(space_id):
    try:
        print(f"[DEBUG] === INICIO ACTUALIZACIÓN ESPACIO {space_id} ===")
        print(f"[DEBUG] Request method: {request.method}")
        print(f"[DEBUG] Request content type: {request.content_type}")
        print(f"[DEBUG] Request form keys: {list(request.form.keys())}")
        
        user_id = int(get_jwt_identity())
        print(f"[DEBUG] User ID: {user_id}")
        
        space = Space.query.get(space_id)
        print(f"[DEBUG] Space encontrado: {space is not None}")
        
        if not space:
            return jsonify({"msg": "Espacio no encontrado."}), 404
        if space.owner_id != user_id:
            return jsonify({"msg": "No autorizado para editar este espacio."}), 403
            
        print(f"[DEBUG] Autorizaciones pasadas, procesando formulario...")

        # Obtener datos del formulario
        title = request.form.get("title", "").strip()
        description = request.form.get("description", "").strip()
        address = request.form.get("address", "").strip()
        price_per_day = request.form.get("price_per_day")
        capacity = request.form.get("capacity")
        
        # Amenidades (checkboxes)
        wifi = request.form.get("wifi") == "true"
        parking = request.form.get("parking") == "true"
        air_conditioning = request.form.get("air_conditioning") == "true"
        kitchen = request.form.get("kitchen") == "true"
        workspace = request.form.get("workspace") == "true"
        projector = request.form.get("projector") == "true"
        
        # Campos de detalles con valores por defecto para espacios existentes
        bathrooms = request.form.get("bathrooms")
        
        # Si bathrooms está vacío o es None, usar valor por defecto
        if not bathrooms or bathrooms.strip() == "":
            bathrooms = "1"  # Valor por defecto
        # Información adicional
        area_sqm = request.form.get("area_sqm")
        floor = request.form.get("floor")
        available_hours = request.form.get("available_hours", "24/7").strip()

        print(f"[DEBUG] Datos recibidos - Title: {title}, Description: {description[:50]}..., Price: {price_per_day}")
        print(f"[DEBUG] Address: {address}, Capacity: {capacity}, Bathrooms: '{bathrooms}' (type: {type(bathrooms)})")
        print(f"[DEBUG] Amenidades - WiFi: {wifi}, Parking: {parking}, AC: {air_conditioning}")
        print(f"[DEBUG] Otros campos - Area: {area_sqm}, Floor: {floor}, Hours: {available_hours}")

        # Validaciones básicas
        if not title:
            return jsonify({"msg": "El título es obligatorio."}), 400
        if not description:
            return jsonify({"msg": "La descripción es obligatoria."}), 400
        if not address:
            return jsonify({"msg": "La dirección es obligatoria."}), 400
        if not price_per_day:
            return jsonify({"msg": "El precio es obligatorio."}), 400
        if not capacity:
            return jsonify({"msg": "La capacidad es obligatoria."}), 400
        # bathrooms ya tiene valor por defecto, no necesita validación de presencia
        
        try:
            price_per_day = float(price_per_day)
            if price_per_day <= 0:
                return jsonify({"msg": "El precio debe ser mayor a 0."}), 400
        except (ValueError, TypeError):
            return jsonify({"msg": "Precio inválido."}), 400
            
        try:
            capacity = int(capacity)
            if capacity <= 0:
                return jsonify({"msg": "La capacidad debe ser mayor a 0."}), 400
        except (ValueError, TypeError):
            return jsonify({"msg": "Capacidad inválida."}), 400
            
        try:
            bathrooms = int(bathrooms)
            if bathrooms <= 0:
                return jsonify({"msg": "El número de baños debe ser mayor a 0."}), 400
        except (ValueError, TypeError):
            return jsonify({"msg": "Número de baños inválido."}), 400
            
        # Validaciones opcionales para campos numéricos
        # Convertir campos opcionales vacíos a None para evitar errores de PostgreSQL
        if area_sqm and area_sqm.strip():
            try:
                area_sqm = int(area_sqm)
                if area_sqm <= 0:
                    area_sqm = None
            except (ValueError, TypeError):
                area_sqm = None
        else:
            area_sqm = None
                
        if floor and floor.strip():
            try:
                floor = int(floor)
            except (ValueError, TypeError):
                floor = None
        else:
            floor = None

        print(f"[DEBUG] Campos después de conversión - area_sqm: {area_sqm} (type: {type(area_sqm)}), floor: {floor} (type: {type(floor)})")
        print(f"[DEBUG] Validaciones pasadas")

        # Actualizar datos básicos del espacio
        space.title = title
        space.description = description
        space.address = address
        space.price_per_day = Decimal(str(price_per_day))
        space.capacity = capacity
        
        # Actualizar amenidades
        space.wifi = wifi
        space.parking = parking
        space.air_conditioning = air_conditioning
        space.kitchen = kitchen
        space.workspace = workspace
        space.projector = projector
        
        # Actualizar información adicional
        space.area_sqm = area_sqm
        space.floor = floor
        space.bathrooms = bathrooms
        space.available_hours = available_hours

        print(f"[DEBUG] Datos básicos y amenidades actualizados")

        # Manejar imágenes
        # 1. Obtener imágenes existentes que se mantienen
        existing_images = request.form.getlist("existing_images")
        print(f"[DEBUG] Imágenes existentes a mantener: {existing_images}")
        
        # 2. Eliminar imágenes que ya no están en la lista
        current_images = SpaceImages.query.filter_by(space_id=space_id).all()
        print(f"[DEBUG] Imágenes actuales en BD: {[img.url for img in current_images]}")
        
        for img in current_images:
            if img.url not in existing_images:
                print(f"[DEBUG] Eliminando imagen: {img.url}")
                db.session.delete(img)

        # 3. Procesar nuevas imágenes subidas
        new_images = request.files.getlist("images")
        print(f"[DEBUG] Nuevas imágenes a subir: {len(new_images)}")
        uploaded_urls = []
        
        for file in new_images:
            if file and file.filename:
                try:
                    print(f"[DEBUG] Procesando archivo: {file.filename}")
                    file_data = file.read()
                    content_type = file.content_type or "image/jpeg"
                    key = _now_key("spaces", file.filename)
                    
                    print(f"[DEBUG] Subiendo a Supabase con key: {key}")
                    # Subir a Supabase
                    public_url = _upload_public_to_supabase(POST_BUCKET, key, file_data, content_type)
                    print(f"[DEBUG] URL subida: {public_url}")
                    
                    # Guardar en base de datos
                    space_image = SpaceImages(space_id=space_id, url=public_url)
                    db.session.add(space_image)
                    uploaded_urls.append(public_url)
                    print(f"[DEBUG] Imagen guardada en BD")
                    
                except Exception as img_err:
                    print(f"[ERROR] Error al subir imagen: {str(img_err)}")
                    return jsonify({"msg": f"Error al subir imagen: {str(img_err)}"}), 500

        print(f"[DEBUG] Haciendo commit de cambios")
        # Confirmar cambios
        db.session.commit()

        # Obtener todas las imágenes actualizadas para la respuesta
        all_images = SpaceImages.query.filter_by(space_id=space_id).all()
        image_urls = [img.url for img in all_images]
        print(f"[DEBUG] Imágenes finales: {image_urls}")

        print(f"[DEBUG] Enviando respuesta exitosa")
        return jsonify({
            "msg": "Espacio actualizado correctamente.",
            "space": {
                "space_id": space.id,
                "title": space.title,
                "description": space.description,
                "address": space.address,
                "price_per_day": float(space.price_per_day),
                "capacity": space.capacity,
                # Amenidades
                "wifi": space.wifi,
                "parking": space.parking,
                "air_conditioning": space.air_conditioning,
                "kitchen": space.kitchen,
                "workspace": space.workspace,
                "projector": space.projector,
                # Información adicional
                "area_sqm": space.area_sqm,
                "floor": space.floor,
                "bathrooms": space.bathrooms,
                "available_hours": space.available_hours,
                "images": image_urls
            }
        }), 200

    except Exception as e:
        print(f"[ERROR] Error en update_space: {str(e)}")
        print(f"[ERROR] Tipo de error: {type(e)}")
        import traceback
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        db.session.rollback()
        return jsonify({"msg": "Error al actualizar espacio.", "error": str(e)}), 500


# ------------------------------------------------------------------------------
# Spaces - DELETE (solo dueño, sin reservas futuras)
# ------------------------------------------------------------------------------
@api.route("/space/<int:space_id>", methods=["DELETE"])
@jwt_required()
def delete_space(space_id):
    try:
        user_id = int(get_jwt_identity())
        space = Space.query.get(space_id)
        if not space:
            return jsonify({"msg": "Espacio no encontrado."}), 404
        if space.owner_id != user_id:
            return jsonify({"msg": "No autorizado."}), 403

        # no permitir borrar si hay reservas futuras o activas
        today = datetime.date.today()
        existing = Booking.query.filter(
            Booking.space_id == space_id,
            Booking.check_out >= today
        ).first()
        if existing:
            return jsonify({"msg": "No se puede eliminar: el espacio tiene reservas futuras/activas."}), 409

        # borrar imágenes registradas (opcional: mantener en storage)
        SpaceImages.query.filter_by(space_id=space_id).delete()
        db.session.delete(space)
        db.session.commit()
        return jsonify({"msg": "Espacio eliminado correctamente."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error al eliminar espacio.", "error": str(e)}), 500


# ------------------------------------------------------------------------------
# Bookings - CREATE
# ------------------------------------------------------------------------------
@api.route("/space/<int:space_id>/new-booking", methods=["POST"])
@jwt_required()
def create_new_booking(space_id):
    current_user_id = get_jwt_identity()

    user = User.query.get(current_user_id)
    if not user or not user.is_active:
        return jsonify({"msg": "Usuario no válido."}), 401

    space = Space.query.get(space_id)
    if not space:
        return jsonify({"msg": "Espacio no encontrado."}), 404

    if space.owner_id == int(current_user_id):
        return jsonify({"msg": "No puedes reservar tu propio espacio."}), 400

    data = request.get_json() or {}

    required_fields = ["check_in", "check_out"]
    for field in required_fields:
        if not data.get(field):
            return jsonify({"msg": f"El campo '{field}' es obligatorio."}), 400

    try:
        check_in  = datetime.datetime.strptime(data["check_in"],  "%Y-%m-%d").date()
        check_out = datetime.datetime.strptime(data["check_out"], "%Y-%m-%d").date()

        if check_in >= check_out:
            return jsonify({"msg": "La fecha de inicio debe ser anterior a la fecha de fin."}), 400
        if check_in < datetime.date.today():
            return jsonify({"msg": "No se pueden hacer reservas para fechas pasadas."}), 400

        existing_booking = Booking.query.filter(
            Booking.space_id == space_id,
            Booking.check_in  < check_out,
            Booking.check_out > check_in
        ).first()
        if existing_booking:
            return jsonify({"msg": "El espacio no está disponible en las fechas seleccionadas."}), 409

        days = int((check_out - check_in).days)
        total_price = days * space.price_per_day

        new_booking = Booking(
            space_id    = space_id,
            guest_id    = current_user_id,
            check_in    = check_in,
            total_days  = days,
            check_out   = check_out,
            total_price = total_price,
            status      = "pending",
        )
        db.session.add(new_booking)
        db.session.commit()

        return jsonify({
            "msg": "Reserva creada exitosamente.",
            "booking": new_booking.serialize(),
            "total_days": days,
            "total_price": total_price
        }), 201

    except ValueError:
        return jsonify({"msg": "Formato de fecha inválido. Use YYYY-MM-DD"}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error al crear reserva.", "error": str(e)}), 500


# ------------------------------------------------------------------------------
# Booking - DELETE (mi reserva)
# ------------------------------------------------------------------------------
@api.route("/my-booking/<int:booking_id>", methods=["DELETE"])
@jwt_required()
def delete_my_booking(booking_id):
    try:
        user_id = int(get_jwt_identity())
        booking = Booking.query.get(booking_id)
        if not booking:
            return jsonify({"msg": "Reserva no encontrada."}), 404
        if booking.guest_id != user_id:
            return jsonify({"msg": "No autorizado."}), 403

        db.session.delete(booking)
        db.session.commit()
        return jsonify({"msg": "Reserva eliminada correctamente."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error al eliminar la reserva.", "error": str(e)}), 500


# ------------------------------------------------------------------------------
# Owner - Solicitudes pendientes de mis espacios
# ------------------------------------------------------------------------------
@api.route("/owner/pending-bookings", methods=["GET"])
@jwt_required()
def owner_pending_bookings():
    try:
        owner_id = int(get_jwt_identity())

        # 1) Trae todas las reservas 'pending' y filtra por espacios cuyo owner sea el usuario actual
        pending = Booking.query.filter_by(status="pending").all()

        bookings = []
        for b in pending:
            # Carga el espacio y valida que pertenezca al owner
            s = Space.query.get(b.space_id)
            if not s or s.owner_id != owner_id:
                continue

            # Carga el huésped
            u = User.query.get(b.guest_id)
            if not u:
                continue

            data = b.serialize()
            data["space"] = {
                "id": s.id,
                "title": s.title,
                "address": s.address,
            }
            # El front espera "image_url" (no avatar_url)
            data["guest"] = {
                "id": u.id,
                "username": u.username,
                "first_name": u.first_name,
                "last_name": u.last_name,
                "email": u.email,
                "image_url": getattr(u, "image_url", None),
            }
            bookings.append(data)

        return jsonify({"bookings": bookings}), 200

    except Exception as e:
        # deja rastro en logs y devuelve 500 legible
        print("owner_pending_bookings ERROR:", e)
        return jsonify({"msg": "Error al obtener solicitudes.", "error": str(e)}), 500



# ------------------------------------------------------------------------------
# Owner - Aceptar / Rechazar reserva
# ------------------------------------------------------------------------------
def _owner_can_manage(booking: Booking, current_owner_id: int) -> bool:
    sp = Space.query.get(booking.space_id)
    return bool(sp and sp.owner_id == current_owner_id)

@api.route("/booking/<int:booking_id>/accept", methods=["POST"])
@jwt_required()
def owner_accept_booking(booking_id):
    try:
        owner_id = int(get_jwt_identity())
        booking = Booking.query.get(booking_id)
        if not booking:
            return jsonify({"msg": "Reserva no encontrada."}), 404
        if not _owner_can_manage(booking, owner_id):
            return jsonify({"msg": "No autorizado."}), 403

        booking.status = "confirmed"
        db.session.commit()
        return jsonify({"msg": "Reserva aceptada."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error al aceptar la reserva.", "error": str(e)}), 500

@api.route("/booking/<int:booking_id>/decline", methods=["POST"])
@jwt_required()
def owner_decline_booking(booking_id):
    try:
        owner_id = int(get_jwt_identity())
        booking = Booking.query.get(booking_id)
        if not booking:
            return jsonify({"msg": "Reserva no encontrada."}), 404
        if not _owner_can_manage(booking, owner_id):
            return jsonify({"msg": "No autorizado."}), 403

        booking.status = "cancelled"
        db.session.commit()
        return jsonify({"msg": "Reserva rechazada."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error al rechazar la reserva.", "error": str(e)}), 500


# ------------------------------------------------------------------------------
# Favoritos
# ------------------------------------------------------------------------------
@api.route("/user/get-favorites", methods=["GET"])
@jwt_required()
def get_user_favorites():
    try:
        user_id = int(get_jwt_identity())
        favorites = FavoritesSpaces.query.filter_by(user_id=user_id).all()
        favorites_data = [fav.space.serialize() for fav in favorites]
        return jsonify({"msg": "Favoritos obtenidos exitosamente.", "favorites": favorites_data}), 200
    except Exception as e:
        return jsonify({"msg": "Error al obtener los favoritos.", "error": str(e)}), 500


@api.route("/user/delete-favorite/<int:favorite_id>", methods=["DELETE"])
@jwt_required()
def delete_user_favorite(favorite_id):
    try:
        current_user_id = get_jwt_identity()
        favorite = FavoritesSpaces.query.get(favorite_id)
        if not favorite:
            return jsonify({"msg": "El favorito no existe."}), 404
        if favorite.user_id != current_user_id:
            return jsonify({"msg": "No tienes permiso para eliminar este favorito."}), 403

        db.session.delete(favorite)
        db.session.commit()
        return jsonify({"msg": "Favorito eliminado exitosamente."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error al eliminar el favorito.", "error": str(e)}), 500


@api.route("/user/create-favorite", methods=["POST"])
@jwt_required()
def create_user_favorite():
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json() or {}
        space_id = data.get("space_id")
        if not space_id:
            return jsonify({"msg": "El campo 'space_id' es obligatorio."}), 400

        space = Space.query.get(space_id)
        if not space:
            return jsonify({"msg": "El espacio no existe."}), 404

        existing = FavoritesSpaces.query.filter_by(user_id=current_user_id, space_id=space_id).first()
        if existing:
            return jsonify({"msg": "Este espacio ya está en tus favoritos."}), 409

        new_fav = FavoritesSpaces(user_id=current_user_id, space_id=space_id)
        db.session.add(new_fav)
        db.session.commit()

        return jsonify({"msg": "Favorito creado exitosamente.", "favorite": new_fav.serialize()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error al crear el favorito.", "error": str(e)}), 500

        # ----------------------------------------------------------------------
# Favoritos - DELETE por space_id (nuevo)
# ----------------------------------------------------------------------
@api.route("/user/delete-favorite-by-space/<int:space_id>", methods=["DELETE"])
@jwt_required()
def delete_favorite_by_space(space_id):
    try:
        current_user_id = get_jwt_identity()

        # Verificar que el espacio exista (opcional pero útil para mensajes claros)
        space = Space.query.get(space_id)
        if not space:
            return jsonify({"msg": "El espacio no existe."}), 404

        favorite = FavoritesSpaces.query.filter_by(
            user_id=current_user_id, space_id=space_id
        ).first()

        if not favorite:
            return jsonify({"msg": "Este espacio no está en tus favoritos."}), 404

        db.session.delete(favorite)
        db.session.commit()
        return jsonify({"msg": "Favorito eliminado correctamente."}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error al eliminar el favorito.", "error": str(e)}), 500



# ------------------------------------------------------------------------------
# Reset Password
# ------------------------------------------------------------------------------
@api.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json() or {}
    if "email" not in data:
        return jsonify({"msg": "Email es requerido"}), 400

    email = data["email"]
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"msg": "Usuario no encontrado"}), 404

    token = secrets.token_urlsafe(32)
    user.reset_token = token
    db.session.commit()

    try:
        # Importación tardía para evitar dependencia circular
        from app import mail
        msg = Message(subject="Recupera tu contraseña", sender="WePlaceIt@wpi.com", recipients=[email])
        msg.body = f"Usa este enlace para recuperar tu contraseña: {FRONTEND_URL}/reset-password/{token}"
        mail.send(msg)
    except Exception as e:
        return jsonify({"msg": f"Error enviando correo: {str(e)}"}), 500

    return jsonify({"msg": "Correo de recuperación enviado"}), 200


@api.route("/reset-password/<token>", methods=["POST"])
def reset_password(token):
    data = request.get_json() or {}
    new_password = data.get("password")

    if not new_password or len(new_password) < 6:
        return jsonify({"msg": "La nueva contraseña es requerida y debe tener al menos 6 caracteres."}), 400

    user = User.query.filter_by(reset_token=token).first()
    if not user:
        return jsonify({"msg": "Token inválido o expirado."}), 400

    user.password = generate_password_hash(new_password)
    user.reset_token = None
    db.session.commit()

    return jsonify({"msg": "Contraseña actualizada correctamente."}), 200


@api.route("/booking/<int:booking_id>/reject", methods=["POST"])
@jwt_required()
def owner_reject_booking(booking_id):
    try:
        owner_id = int(get_jwt_identity())
        booking = Booking.query.get(booking_id)
        if not booking:
            return jsonify({"msg": "Reserva no encontrada."}), 404

        sp = Space.query.get(booking.space_id)
        if not sp or sp.owner_id != owner_id:
            return jsonify({"msg": "No autorizado."}), 403

        booking.status = "cancelled"
        db.session.commit()
        return jsonify({"msg": "Reserva rechazada."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error al rechazar la reserva.", "error": str(e)}), 500
