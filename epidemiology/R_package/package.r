require('roxygen2')
package.skeleton('plom', code_files='plot.r', force=TRUE)
roxygenize('plom', overwrite=TRUE, copy.package=FALSE, unlink.target=FALSE)
