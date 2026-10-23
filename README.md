# Cuevana Pro para Kino

Plugin de [Kino](https://github.com/kinotvapp/kino-light) para ver **películas y series** en español latino, castellano o en su idioma original de
[Cuevana](https://wv3.cuevana3.eu/) (cuevana3.eu). Sigue el proveedor «Cuevana» del repositorio de CloudStream `redblacker8/storm-ext`.

> Plugin no oficial. El catálogo y los videos pertenecen al sitio y a los servidores donde están alojados; este plugin solo los lista y abre
> dentro de Kino.

## Instalar

En Kino: **Ajustes ▸ Plugins ▸ Agregar**, y pega:

```
xuper-plugin/kino-plugin-cuevanapro
```

Kino pide tres permisos en rojo: *abrir páginas web ocultas para encontrar el video*, *reproducir video desde cualquier servidor que indique* y *conectarse a cualquier servidor público* (solo https, nunca tu red local).
Hacen falta para VOE, que arma su dirección con JavaScript, y para las direcciones de video que cambian de dominio.

## Qué trae

- **Una sección propia** («Cuevana Pro») con cinco pestañas —*Novedades*, *Películas*, *Series*, *Estrenos* y *Géneros*— y un destacado.
- **Inicio** con películas y series actualizadas, estrenos y tendencias.
- **Categorías**: 12 géneros, cada uno con su lista por páginas.
- **Búsqueda** (también dentro de Películas o Series), **ficha** con sinopsis, géneros, año, duración y nota, **temporadas y episodios** con su fecha
  e imagen, y **descarga**.
- **Ajustes ▸ Cuevana Pro**: idioma preferido (latino, castellano o inglés) y vaciar la caché.

## Servidores

Cada título trae servidores por idioma. Kino abre primero el idioma que elijas y deja los demás en el menú **Servidor**:

| Servidor | Cómo se abre |
| --- | --- |
| StreamWish y VidHide | peticiones normales, sin navegador (StreamWish por `vibuxer.com`: `streamwish.to` ya solo devuelve un cargador de JavaScript) |
| VOE | el navegador oculto de Kino (`kino.browser`), una sola página por título |
| DoodStream, Streamtape, Netu | no se usan (DoodStream rechaza las peticiones; los otros no tienen lector) |

## Desarrollo

```
npm test            # pruebas sin red
npm run validate    # compila plugin.js y valida el manifiesto con el kit
node sdk/run.mjs ./plugin.js resolve 'm:bad-apples'
```

Licencia Apache-2.0 (ver `LICENSE` y `NOTICE`).
