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

## Registro obligatorio
Nadie puede usar el bot hasta registrarse:
```
!reg nombre.edad        ejemplo: !reg Juan.20
```
Al registrarse recibe un mensaje de **registro exitoso** con la imagen `assets/registro.jpg`, un ID unico y 500 monedas de bono. Quien escribe un comando sin registro recibe el aviso de acceso restringido con las instrucciones. Los datos se guardan por servidor en `data/serverN/db.json`.

## Comandos del bot (prefijo `!`) - 100 comandos
| Categoria | Comandos |
|---|---|
| General | `!menu` (imagen + lista + audio), `!ping`, `!info`, `!servidor`, `!id`, `!owner`, `!reglas`, `!estado` |
| Registro | `!reg`, `!unreg`, `!perfil` (nivel, XP, monedas) |
| Economia | `!saldo`, `!diario`, `!trabajar`, `!apostar`, `!tienda`, `!comprar`, `!transferir`, `!top` |
| Juegos | `!ahorcado`, `!trivia`, `!adivina`, `!ppt` |
| Diversion | `!dado`, `!moneda`, `!elegir`, `!bola`, `!frase`, `!ship`, `!matrimonio` |
| Grupos | `!grupo`, `!tagall`, `!kick`, `!add`, `!promote`, `!demote`, `!antilink`, `!bienvenida`, `!despedida`, `!silenciar`, `!abrir`, `!advertir`, `!perdonar`, `!sorteo`, `!link` |
| Utilidades | `!calc`, `!say` |
| Matematicas | `!suma`, `!resta`, `!multiplicacion`, `!division`, `!potencia`, `!raiz`, `!porcentaje` |
| Finanzas | `!cambio`, `!dolar`, `!euro`, `!cripto`, `!igv` |
| Mundo | `!hora` (por pais), `!paises`, `!clima` |
| Informacion | `!noticias`, `!sismo`, `!feriados`, `!pais`, `!ip`, `!pelicula`, `!serie`, `!musica`, `!letra`, `!inflacion`, `!pbi` |
| Multimedia | `!imagen` (IA), `!sticker` (imagen o video), `!toimg`, `!tts`, `!qr`, `!blanconegro`, `!blur`, `!invertir`, `!meme` |
| Descargas | `!tiktok`, `!ytmp3`, `!ytmp4`, `!play`, `!instagram`, `!facebook`, `!dl` |
| Herramientas | `!traducir`, `!wiki`, `!convertir`, `!clave` |
| Estudio | `!ia`, `!resumir`, `!corregir`, `!recordatorio`, `!alarma` |
| Owner | `!modo publico/privado`, `!broadcast` |

Los comandos de grupo de administracion (`kick`, `add`, `promote`, etc.) exigen que quien los use sea admin del grupo y que el bot tambien lo sea. `!antilink on` borra enlaces y suma advertencias; a las 3 expulsa. `!bienvenida` y `!despedida` estan activas por defecto.

### Bienvenida y menu juntos
El mensaje de bienvenida de los grupos usa el mismo estilo del menu (negritas, cursivas, emojis), incluye la imagen, el aviso de `!reg nombre.edad`, la lista de categorias del bot y el credito **Desarrollador: Xato D3v**.

### Servicios publicos usados (sin API key)
open.er-api.com (divisas), CoinGecko (cripto), wttr.in (clima), MyMemory (traductor), Wikipedia, Google Noticias RSS, USGS (sismos), Nager.Date (feriados), REST Countries, ipwho.is, iTunes Search (peliculas, series, musica), lyrics.ovh, BCRP y Banco Mundial (inflacion y PBI), Pollinations (imagenes e IA, limite ~1 peticion/15 s sin clave) y TikWM (TikTok). Si alguno cambia, solo ese comando avisa del error.

### Descargas (YouTube, Instagram, Facebook...)
No existe una API publica estable para YouTube, asi que `!ytmp3`, `!ytmp4`, `!play`, `!instagram`, `!facebook` y `!dl` usan **yt-dlp** instalado en tu equipo (y **ffmpeg** para audio MP3 y stickers de video):
```bash
pip install -U yt-dlp        # o descarga el binario desde github.com/yt-dlp/yt-dlp
# ffmpeg: https://ffmpeg.org/download.html  (Termux: pkg install ffmpeg)
```
Sin yt-dlp esos comandos avisan que falta instalarlo; `!tiktok` funciona igual por TikWM. Limite 60 MB por archivo y 20 s de espera entre descargas.

### Variables extra (.env)
- `OWNER_NUMBERS`: numeros dueños adicionales (con codigo de pais, separados por coma). La cuenta vinculada siempre es dueña.
- `POLLINATIONS_KEY`: clave gratuita opcional para subir el limite de la IA.

### Agregar un comando nuevo
Crea o edita un archivo en `src/bot/cmds/` (o `src/bot/commands.js`) y agrega un objeto al arreglo. Opciones: `noReg`, `group`, `admin`, `botAdmin`, `owner`:
```js
{
  name: 'hola',
  cat: 'Diversion',
  desc: 'Saluda al usuario',
  async run({ reply, user }) { await reply(`Hola ${user.name}, soy Xato Ds`); },
}
```
Usa `cat` para agrupar el comando en el menu. El menu se actualiza solo.

## Estructura
```
xato-server-dev/
  assets/          menu.jpg y menu.mp3 (usados por !menu)
  public/          panel web (HTML, CSS, JS)
  src/
    index.js       arranca los 3 servidores y el panel
    gateway.js     API publica + admin
    node-server.js un servidor de sesiones
    bot/           session-manager, handler, db, style, commands.js y cmds/ (comandos por categoria)
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
- `assets/menu.jpg`, `assets/registro.jpg` y `assets/menu.mp3` son obras con derechos de autor. Si el repositorio es publico, considera usar contenido propio o libre de derechos.
