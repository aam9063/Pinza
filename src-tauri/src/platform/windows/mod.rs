//! Llamadas directas a Win32: carpetas conocidas, posición del cursor y avisos
//! de pantalla completa.
//!
//! Es el único módulo con permiso para usar `unsafe`, y cada bloque lleva su
//! comentario `// SAFETY:` explicando la invariante que asume.

#![allow(unsafe_code)]
