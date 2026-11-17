# Comprobaciones que necesitan un escritorio interactivo: atajo global y
# arrastre nativo a otra aplicación.
#
# Todavía no hay nada que comprobar: el atajo global llega con M1 y el
# arrastre nativo con M2. El script falla a propósito para que nadie confunda
# un verde vacío con una verificación real.
$ErrorActionPreference = 'Stop'

Write-Output 'Sin comprobaciones nativas en M0.'
Write-Output 'El atajo global se verifica a partir de M1 y el arrastre nativo a partir de M2.'
exit 3
