<p align="center"><img src="assets/menu.jpg" alt="Xato Ds" width="640"></p>

# Xato S3erver Dev

Plataforma de **3 servidores** de sesiones de WhatsApp, cada uno con un limite de **5 registros** (15 en total), y el bot automatico **Xato Ds**. El usuario escribe su numero, el sistema genera un QR y al escanearlo desde WhatsApp el bot queda activo. Incluye modo administrador para eliminar sesiones.

## Requisitos
- Node.js 18 o superior
- Git instalado (algunas dependencias de Baileys se descargan desde GitHub)

## Instalacion
```bash
npm install
cp .env.example .env      # en Windows: copy .env.example .env
# edita .env y cambia ADMIN_PASSWORD
npm start
```
Abre **http://localhost:3000**

## Como funciona
| Parte | Descripcion |
|---|---|
| Servidores 1, 2 y 3 | Procesos independientes (puertos 3001, 3002, 3003) con su propia carpeta en `data/serverN`. Maximo 5 registros cada uno |
| Panel / gateway | Puerto 3000. Asigna cada numero nuevo al primer servidor con cupo libre |
| Registro | Numero con codigo de pais (ej. `51912345678`) > QR > WhatsApp > Dispositivos vinculados |
| Cupos | Si el QR no se escanea en 3 minutos, el cupo se libera solo |
| Modo admin | Boton "Admin" > clave de `.env` > ver y eliminar sesiones de los 3 servidores |

Las sesiones se guardan en `data/` (ignorado por Git) y se reconectan solas al reiniciar.

## Comandos del bot (prefijo `!`)
| Comando | Funcion |
|---|---|
| `!menu` | Muestra el menu con la imagen `assets/menu.jpg` y envia el audio `assets/menu.mp3` |
| `!ping` | Latencia |
| `!info` | Datos del bot y del servidor |
| `!hora` | Fecha y hora (Lima) |
| `!id` | ID del chat |

### Agregar un comando nuevo
Edita `src/bot/commands.js` y agrega un objeto al arreglo:
```js
{
  name: 'hola',
  desc: 'Saluda al usuario',
  async run({ reply }) { await reply('Hola, soy Xato Ds'); },
}
```
El menu se actualiza solo.

## Estructura
```
xato-server-dev/
  assets/          menu.jpg y menu.mp3 (usados por !menu)
  public/          panel web (HTML, CSS, JS)
  src/
    index.js       arranca los 3 servidores y el panel
    gateway.js     API publica + admin
    node-server.js un servidor de sesiones
    bot/           session-manager, handler y commands
  data/            sesiones (no se sube a Git)
```

## Subir a GitHub
```bash
git init
git add .
git commit -m "Xato S3erver Dev"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/xato-server-dev.git
git push -u origin main
```

## Avisos
- Este proyecto usa Baileys, una libreria **no oficial** de WhatsApp Web. Usalo con cuidado: WhatsApp puede limitar numeros que hagan spam o abuso.
- `assets/menu.jpg` y `assets/menu.mp3` son obras con derechos de autor. Si el repositorio es publico, considera usar contenido propio o libre de derechos.
