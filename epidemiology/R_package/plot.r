#' plom.io/epidemiology plotting utilities
#' 
#' plot data and main structure of the C_lib (s_X, s_best and s_hat)
#'
#' The main purpose of this package is to let you explore as quickly
#' as possible the results obtained with plom command line tools
#'
#' @name plom-package
#' @aliases plom
#' @docType package
#' @author Sebastien Ballesteros \email{sebastien@plom.io}
#' @references \url{http://www.plom.io/}.
NULL

library("RJSONIO")

#' Get the settings needed to plot plom results
#'
#' @param root The path of the root of the plom model directory without trailing slash
#' @param id The name of the settings file (with a .json extension)
#' @return the created settings object
#' @export
get.settings <- function(root="..", id="settings.json"){

  s <- list()
  s$root <- root

  s$path.settings <- file.path(s$root, "settings", id)
  
  s$load <- function(){fromJSON(s$path.settings, nullValue=NA, simplify=Strict)}
  s$settings <- s$load()
  
  ##usefull constant
  s$N_CAC <- as.numeric(s$settings$cst['N_C']) * as.numeric(s$settings$cst['N_AC'])
  s$N_PAR_SV <- as.numeric(s$settings$cst['N_PAR_SV'])
  s$N_PAR_PROC <- as.numeric(s$settings$cst['N_PAR_PROC'])
  s$N_PAR_OBS <- as.numeric(s$settings$cst['N_PAR_OBS'])
  s$N_TS <- as.numeric(s$settings$cst['N_TS'])
  s$N_THETA_MIF <- s$settings$iterators$par_proc_par_obs_no_drift$length
  s$ONE_YEAR_IN_DATA_UNIT <- as.numeric(s$settings$cst['ONE_YEAR_IN_DATA_UNIT'])
  s$N_DATA <- as.numeric(s$settings$cst['N_DATA'])

  ##how many drift
  drift_var <- s$settings$order$drift_var
  
  N_ALL_DRIFT <- 0
  for(x in drift_var){
    p <- strsplit(x, '__')[[1]][3]
    partition_id <- s$settings$parameters[[p]]$partition_id
    N_ALL_DRIFT <- N_ALL_DRIFT + length(s$settings$partition[[partition_id]]$group)
  }
  s$N_ALL_DRIFT <- N_ALL_DRIFT
  
  ##offsets
  s$X_OFFSET_OBS <- 3+ s$N_PAR_SV*s$N_CAC
  s$X_OFFSET_DRIFT <- s$X_OFFSET_OBS + s$N_TS
  s$X_OFFSET_OBS_NOISE <- s$X_OFFSET_DRIFT + s$N_ALL_DRIFT
  
  s$HAT_OFFSET_OBS <- 2+ s$N_PAR_SV * s$N_CAC * 3
  s$HAT_OFFSET_DRIFT <- s$HAT_OFFSET_OBS + s$N_TS * 3
  
  ##graohical par
  s$COL_DATA = rgb(1,0,0,0.5) 

  if(s$N_DATA){
    data <- as.data.frame(do.call(rbind, s$settings$data$data))
    names(data) <- s$settings$order$ts_id
    dates <- data.frame(dates=as.Date(s$settings$data$dates))
    s$data <- cbind(dates,data)
  }

  return(s)
}

#' Split the display to plot n graphs
#'
#' @param n the number of graphs
#' @export  
sfrSplit <- function(n){
  par(mgp = c(2,1,0), mar=c(3,3,0.5,0.5))
  layout(matrix(1:(ceiling(sqrt(n))*round(sqrt(n))), round(sqrt(n)), ceiling(sqrt(n))))
}

#' y ranging from y.min and y.max will be rescaled in between x.min and x.maxRescale
#'
#' @param y the value to be rescaled
#' @param y.min the minimum possible value of y
#' @param y.max the maximum possible value of y
#' @param x.min the minimum value of the rescaled version of y
#' @param x.max the maximum value of the rescaled version of y
#' @return the rescaled value of y
#' @export
rescale <- function(y,  y.min, y.max, x.min, x.max){
    #y ranging from y.min and y.max will be rescaled in between x.min and x.max
    return(((y-y.min)/(y.max-y.min)) *(x.max-x.min) + x.min)
}



###########################
##graphs
##########################

#' Plot the data
#'
#' @param s a settings object (obtained with \code{\link{get.settings}})
#' @export  
plot.data <- function(s){

  sfrSplit(s$N_TS)
  
  for(i in 1:s$N_TS){
    plot(s$data$dates, s$data[[i+1]],
         type='s',
         col=s$COL_DATA,
         xlab='', ylab=names(s$data)[i+1])
  }
}


#' Plot the observed variable
#'
#' @param s a settings object (obtained with \code{\link{get.settings}})
#' @param res the directory name (not a path) where the X_<id>.output file can be found
#' @param id the id of the X_<id>.output file
#' @param obs logical Should realisation of the observation model be plotted
#' @param obs logical Should the  minima and maxima detected by simul --bif be plotted
#' @export  
plot.X <- function(s, res='bin', id=0, obs=TRUE, bif=FALSE){

  mypath <- file.path(s$root, res, paste("X_", id, ".output", sep=''))
  X <- read.table(mypath, header=TRUE)
  Jset <- X[,1]
  ind.time <- order(X[(Jset == min(Jset)) & (X[,2]>0), 2])

  if(max(ind.time) == s$N_DATA) {
    simul <- FALSE
  } else {
    simul <- TRUE
  }  
  
  obs.mean <- data.frame(X[, s$X_OFFSET_OBS:(s$X_OFFSET_DRIFT - 1) ])
  drift <- data.frame(X[, s$X_OFFSET_DRIFT:(s$X_OFFSET_OBS_NOISE - 1) ])
  obs.noise <- data.frame(X[, s$X_OFFSET_OBS_NOISE:(s$X_OFFSET_OBS_NOISE + s$N_TS - 1) ])
  xtime <- if(simul) X[(Jset == min(Jset)), 2] else s$data$dates
  J <- length(unique(Jset))
  Jalpha <- min(10, J)
  rm(X)

  if(obs){ #plot observation noise
    min.obs <- apply(obs.noise, 2, min)
    max.obs <- apply(obs.noise, 2, max)
  } else{
    min.obs <- apply(obs.mean, 2, min)
    max.obs <- apply(obs.mean, 2, max)
  }
  min.drift <- apply(drift, 2, min)
  max.drift <- apply(drift, 2, max)

  sfrSplit(s$N_TS + s$N_ALL_DRIFT)

  ##observed variables
  for(i in 1:s$N_TS){
    if(simul){
      plot(xtime, obs.mean[Jset==0, 1],
           ylim=c(min.obs[i], max.obs[i]),
           type='n',
           xlab='', ylab=names(obs.mean)[i])
    } else {
      plot(xtime, s$data[[i+1]],
           ylim=c(min(s$data[[i+1]], min.obs[i], na.rm=TRUE), max(s$data[[i+1]], max.obs[i], na.rm=TRUE)),
           type='n',
           xlab='', ylab=names(obs.mean)[i])
    }

    if(obs){
      ##observation noise
      for(j in unique(Jset)){
        yfit <- obs.noise[Jset==j, i]
        lines(xtime, yfit[ind.time], type='s', col=rgb(0.7,0.81, 1, alpha = 1/Jalpha))
      }
    }

    for(j in unique(Jset)){
      yfit <- obs.mean[Jset==j, i]
      lines(xtime, yfit[ind.time], type='s', col=rgb(0,0,0, alpha = 1/Jalpha))
    }

    ##data at the fist layer
    if(!simul)
      lines(xtime, s$data[[i+1]], type='s', col=s$COL_DATA)


    if(bif){
      mypath <- file.path(s$root, res, paste("max_",i-1, "_", id, ".output", sep=''))
      fmax <- tryCatch(read.table(mypath), error=function(e) 0)
      if(is.data.frame(fmax))
        points(fmax[,2], fmax[,1], col='red')

      mypath <- file.path(s$root, res, paste("min_",i-1, "_", id, ".output", sep=''))
      fmin <- tryCatch(read.table(mypath), error=function(e) 0)
      if(is.data.frame(fmin))
        points(fmin[,2], fmin[,1], col='blue')
    }

  }

  ##drift
  if(s$N_ALL_DRIFT){
      for(i in 1:N_ALL_DRIFT){
          plot(xtime, drift[Jset==0, i][ind.time],
               ylim=c(min(min.drift[i], na.rm=TRUE), max(max.drift[i], na.rm=TRUE)),
               type='n',
               xlab='', ylab=names(drift)[i])

          for(j in unique(Jset)){
              yfit <- drift[Jset==j, i]
              lines(xtime, yfit[ind.time], type='s', col=rgb(0,0,0, alpha = 1/Jalpha))
          }
      }
  }

}


#' Plot the state variable
#'
#' @param s a settings object (obtained with \code{\link{get.settings}})
#' @param res the directory name (not a path) where the hat_<id>.output file can be found
#' @param id the id of the hat_<id>.output file
#' @export
plot.SV <- function(s, res='bin', id=0){

  mypath <- file.path(s$root, res, paste("hat_", id, ".output", sep=''))
  hat <- read.table(mypath, header=TRUE)
  
  if(max(hat[,1]) == s$N_DATA) {
    simul <- FALSE
  } else {
    simul <- TRUE
  }

  n <- s$N_PAR_SV*s$N_CAC
  sfrSplit(n)
  
  for(i in 1:n){
    if(simul){
      xtimes <- hat[, 1]
    } else {
      xtimes <- s$data$dates
    }
    
    mylow95 <- hat[,2+(i-1)*3]
    mymean <-  hat[,2+(i-1)*3+1]
    myhigh95 <-  hat[,2+(i-1)*3+2]
    myname <- names(hat)[2+(i-1)*3+1]
    
    plot(xtimes, mymean,
         type='l',
         xlab='', ylab=myname)
    
    polygon(c(xtimes, rev(xtimes)), c(mylow95, rev(myhigh95)), col=rgb(red=190,green=190, blue=190,max = 255, alpha = 200), border=NA)
  }
}


#' Plot the reconstructed observed variable and their 95\% confidence interval
#'
#' @param s a settings object (obtained with \code{\link{get.settings}})
#' @param res the directory name (not a path) where the hat_<id>.output file can be found
#' @param id the id of the hat_<id>.output file
#' @export
plot.hat <- function(s, res='bin', id=0){
  
  mypath <- file.path(s$root, res, paste("hat_", id, ".output", sep=''))
  hat <- read.table(mypath, header=TRUE)

  if(max(hat[,1]) == s$N_DATA) {
    simul <- FALSE
    xtimes <- s$data$dates
  } else {
    simul <- TRUE
    xtimes <- hat[, 1]
  }
  
  n <- s$N_TS+s$N_ALL_DRIFT
  sfrSplit(n)
  
  for(i in 1:s$N_TS){

    mylow95 <- hat[, s$HAT_OFFSET_OBS + (i-1)*3]
    mymean <-  hat[, s$HAT_OFFSET_OBS + (i-1)*3+1]
    myhigh95 <-  hat[, s$HAT_OFFSET_OBS + (i-1)*3+2]


    if(simul){
      plot(xtimes, mymean,
           ylim=c(min(mylow95), max(myhigh95)),
           type='n',
           xlab='', ylab=names(hat)[s$HAT_OFFSET_OBS + (i-1)*3+1])
    } else {
    plot(s$data$dates, s$data[[i+1]],
         ylim=c(min(s$data[[i+1]], mylow95, na.rm=TRUE), max(s$data[[i+1]], myhigh95, na.rm=TRUE)),
         type='n',
         xlab='', ylab=names(hat)[s$HAT_OFFSET_OBS+(i-1)*3+1])
    }
    
    polygon(c(xtimes, rev(xtimes)), c(mylow95, rev(myhigh95)), col=rgb(red=190,green=190, blue=190,max = 255, alpha = 200), border=NA)
    lines(xtimes, mymean, type='s')

    ##data at the fist layer
    if(!simul)
      lines(xtimes, s$data[[i+1]], type='s', col=s$COL_DATA)
  }

  if(s$N_ALL_DRIFT){
      for(i in 1:s$N_ALL_DRIFT){
          mylow95 <- hat[,s$HAT_OFFSET_DRIFT+(i-1)*3]
          mymean <-  hat[,s$HAT_OFFSET_DRIFT+(i-1)*3+1]
          myhigh95 <-  hat[,s$HAT_OFFSET_DRIFT+(i-1)*3+2]

          plot(xtimes, mymean,
               ylim=c(min(mylow95, na.rm=TRUE), max(myhigh95, na.rm=TRUE)),
               type='n',
               xlab='', ylab=names(hat)[s$HAT_OFFSET_DRIFT+(i-1)*3+1])
          polygon(c(xtimes, rev(xtimes)), c(mylow95, rev(myhigh95)), col=rgb(red=190,green=190, blue=190,max = 255, alpha = 200), border=NA)
          lines(xtimes, mymean, type='s')
      }
  }
}



#' Helper function for plotting functions requiring to access a plom best_<id>.output
#'
#' @param s a settings object (obtained with \code{\link{get.settings}})
#' @param res the directory name (not a path) where the best_<id>.output file can be found
#' @param id the id of the best_<id>.output file
#' @param skip the number of iteration to be skipped
#' @return the best object
#' @export
helper.best <- function(s, res='bin', id=0, skip=0) {

  mypath <- file.path(s$root, res, paste("best_", id, ".output", sep=''))
  best <- read.table(mypath, header=TRUE)
  if(skip <= nrow(best)){
    best <- best[(skip+1):nrow(best), ]
  } else {
    warning('skip has been ignored (skip > nrow(best))')
  }

  return(best)
}


#' Plot the evolution of the parameters as a function of the number of iteration of the inference method
#'
#' @param s a settings object (obtained with \code{\link{get.settings}})
#' @param res the directory name (not a path) where the best_<id>.output file can be found
#' @param id the id of the best_<id>.output file
#' @param skip the number of iteration to be skipped
#' @export
plot.best <- function(s, res='bin', id=0, skip=0){

  mypath <- file.path(s$root, res, paste("best_", id, ".output", sep=''))
  best <- read.table(mypath, header=TRUE)

  if(!is.na(skip) & (skip <= dim(best)[1])){
    best <- best[skip:dim(best)[1], ]
  }

  m <- best[,1]

  if(length(m) == 1) mytype = 'p' else mytype = 'l'

  #get parname and group from the header
  header <-  names(best)[2:(length(names(best))-1)]
  ng <- sapply(header, function(x){return(unlist(strsplit(x, "\\.")))})
  #create a hash with key = name, value = list of groups
  keys <- unique(ng[1,])
  hash <- list()
  for(k in keys){
    hash[[k]] <- unname(ng[2, ng[1,] == k])
  }
    
  n <- length(keys)+1
  sfrSplit(n)

  offset <- 1
  for (parname in names(hash)){
    ngroup <- length(hash[[parname]])
    block <- best[, (1+offset):(offset+ngroup)]
    
    if(ngroup >1){
      mylim <- c(min(apply(block,2,min)), max(apply(block,2,max)))
      cols <- c('black', rainbow(ngroup-1))
    } else{
      cols <- c('black')
      mylim <- c(min(block), max(block))
    }

    plot(m, best[, 1+offset], type=mytype, ylab=parname, ylim=mylim, xlab="# iterations", col=cols[1])
    abline(h=s$settings[[ 'parameters' ]][[ parname ]][[ 'min' ]][[ hash[[parname]][1] ]], lty=2, col=cols[1])
    abline(h=s$settings[[ 'parameters' ]][[ parname ]][[ 'max' ]][[ hash[[parname]][1] ]], lty=3, col=cols[1])

    legend("topright", hash[[parname]], bty='n', text.col = cols,bg = 'transparent')    
    
    offset <- offset +1

    if(ngroup >1){
      for(i in 2:ngroup){
        lines(m, best[, 1+offset], col=cols[i], type=mytype)
        abline(h=s$settings[[ 'parameters' ]][[ parname ]][[ 'min' ]][[ hash[[parname]][i] ]], lty=2, col=cols[i])
        abline(h=s$settings[[ 'parameters' ]][[ parname ]][[ 'max' ]][[ hash[[parname]][i] ]], lty=3, col=cols[i])        
        offset <- offset +1
      }
    }
  }

  #log likelihood
  plot(m, best[, ncol(best)], xlab="# iterations", ylab="log likelihood", mgp=c(2,1,0), type=mytype)
}


#' Plot the prediction residuals, the effective sample size (ESS) and the log likelihood
#'
#' @param s a settings object (obtained with \code{\link{get.settings}})
#' @param res the directory name (not a path) where the pred_res_<id>.output file can be found
#' @param id the id of the pred_res_<id>.output file
#' @export
plot.residuals <- function(s, res='bin', id=0){

  mypath <- file.path(s$root, res, paste("pred_res_", id, ".output", sep=''))
  predres <- read.table(mypath, header=TRUE)

  n <- s$N_TS
  sfrSplit(n)

  inddatanonan <- predres[, 1]

  myess <- rep(NA, length(s$data$dates))
  myLlike <- rep(NA, length(s$data$dates))

  myess[inddatanonan] <- predres[, 2+2*s$N_TS]
  myLlike[inddatanonan] <- predres[, 3+2*s$N_TS]

  for(i in 1:s$N_TS){
    mymean <- rep(NA, length(s$data[[i+1]]))
    mypredres <- rep(NA, length(s$data[[i+1]]))

    mymean[inddatanonan] <-  predres[,2+(i-1)*2]
    mypredres[inddatanonan] <- predres[,2+(i-1)*2+1]

    plot(s$data$dates, s$data[[i+1]],
         ylim=c(min(s$data[[i+1]], mymean, na.rm=TRUE), max(s$data[[i+1]], mymean, na.rm=TRUE)),
         type='n',
         xlab='',
         ylab=bquote(paste("E", group("[", paste(y[t],"|",y[1:t-1]),"]"), " ") ~ .(names(s$data)[i+1]) ))

    legend("topright", c('ESS', 'log like', 'data', 'prediction'), bty='n', text.col = c('blue', 'green', 'red', 'black'), bg = 'transparent')    
        
    #ESS
    lines(s$data$dates,
          rescale(myess, min(myess,na.rm=TRUE), max(myess, na.rm=TRUE), min(s$data[[i+1]], na.rm=TRUE), max(s$data[[i+1]], na.rm=TRUE)),
          type='s', col=rgb(0,0,1,alpha=0.5))
    ##log likelihood
    lines(s$data$dates,
          rescale(myLlike, min(myLlike,na.rm=TRUE), max(myLlike, na.rm=TRUE), min(s$data[[i+1]], na.rm=TRUE), max(s$data[[i+1]], na.rm=TRUE)),
          type='s', col=rgb(0,1,0,alpha=0.5))

    #data
    lines(s$data$dates, s$data[[i+1]], col=s$COL_DATA, type='s')
    #predicted
    lines(s$data$dates, mymean, type='s')

    #residuals
    points(s$data$dates, rescale(mypredres, min(mypredres, na.rm=TRUE), max(mypredres, na.rm=TRUE), min(s$data[[i+1]], na.rm=TRUE), max(s$data[[i+1]], na.rm=TRUE)), pch=16, col=rgb(0,0,0, alpha = 0.8), cex=0.5)
    abline(h=rescale(0, min(mypredres, na.rm=TRUE), max(mypredres, na.rm=TRUE), min(s$data[[i+1]], na.rm=TRUE), max(s$data[[i+1]], na.rm=TRUE)), lty=2, col=rgb(0,0,0, alpha = 0.8))

  }

}


###########################
##Posteriors
###########################



#' Helper function to plot a posterior
#'
#' @param y the vector of values to be plotted as an histogram
#' @param xlab custom label of the x axis
#' @param adjust the adjust parameter of R \code{\link{density}} function
#' @export
helper.posterior <- function(y, xlab, adjust=3){
  hist(y, probability=TRUE, xlab=xlab, border='grey' , main='')
  lines(density(y, na.rm=TRUE, adjust=adjust))
  abline(v=quantile(y, .025, na.rm=TRUE), lty=2, col='skyblue')
  abline(v=quantile(y, .975, na.rm=TRUE), lty=2, col='skyblue')
}


#' Plot the posterior of parameter par of group group
#'
#' @param s a settings object (obtained with \code{\link{get.settings}})
#' @param par the parameter name
#' @param group the group name
#' @param res the directory name (not a path) where the best_<id>.output file can be found
#' @param id the id of the best_<id>.output file
#' @param skip the number of iteration to be skipped
#' @param xlab custom label of the x axis
#' @export
plot.posterior <- function(s, par, group, res='bin', id=0, skip=0, xlab=NULL){

  best <- helper.best(s, res=res, id=id, skip=skip)
  parstring <- paste(par, group, sep='.')

  y <- best[[parstring]]

  if(is.null(xlab)) xlab = parstring
  
  helper.posterior(y, xlab=xlab)  
}


#' Plot the the posteriors of all the fitted parameters
#'
#' @param s a settings object (obtained with \code{\link{get.settings}})
#' @param res the directory name (not a path) where the best_<id>.output file can be found
#' @param id the id of the best_<id>.output file
#' @param skip the number of iteration to be skipped
#' @export
plot.posteriors <- function(s, res='bin', id=0, skip=0){

  best <- helper.best(s, res=res, id=id, skip=skip)
  
  #index of the fitted parameters:
  ind.fitted <- 1+as.numeric(which(apply(best[2:(ncol(best)-1)],2,var) >0.0))
  
  n <- length(ind.fitted)+1 #+1 for like
  sfrSplit(n)

  for(x in ind.fitted){
    helper.posterior(best[,x], xlab=names(best)[x])        
  }
  
  #log likelihood
  y <- best[, ncol(best)]
  helper.posterior(y, xlab="log likelihood")  

}




###########################
##Slice
###########################


#' Plot the likelihood slice of parameter par of group group
#'
#' @param s a settings object (obtained with \code{\link{get.settings}})
#' @param par the parameter name
#' @param group the group name
#' @param res the directory name (not a path) where the results of the slice design can be found
#' @param llike.min Every points whose log likelihood values is smaller that llike.min will be discarded
#' @param xlab custom label of the x axis
#' @param ylab custom label of the y axis
#' @export
plot.slice <- function(s, res, par, group, llike.min=NA, ylab='log likelihood', xlab=NA){
  
  path.design <- file.path(s$root, 'results', res, par, group, 'design.des')
  if (file.exists(path.design)) {
    des <- read.table(path.design, header=TRUE)
    x <- des[[paste(par,group,sep='.')]]
    
    y <- NULL
    for(i in 1:nrow(des)){
      mypath <- file.path(s$root, 'results', res, par, group, paste("best_", i-1, ".output", sep=''))
      best <- read.table(mypath, header=TRUE)
      parstring <- paste(par,group,sep=':')
      y <- c(y, best[,ncol(best)])
    }

    if(!is.na(llike.min)){
        myylim <- c(llike.min, max(y, na.rm=TRUE))
    } else {
        myylim <- c(min(y, na.rm=TRUE), max(y, na.rm=TRUE))
    }
    if(is.na(xlab)){
      xlab = paste(paste(par,group,sep=':'))
    }
    
    plot(x, y, type='b', xlab=xlab, ylab=ylab, mgp=c(2,1,0), ylim=myylim)
    abline(v=s$settings$parameters[[par]][['guess']][[group]], col='skyblue', lty=2)    

  } else {
    print (paste("could not find the design:", path.design))
  }
}


#' Plot the likelihood slice of every parameter
#'
#' @param s a settings object (obtained with \code{\link{get.settings}})
#' @param res the directory name (not a path) where the results of the slices design can be found
#' @param llike.min Every points whose log likelihood values is smaller that llike.min will be discarded
#' @param ylab custom label of the y axis
#' @export
plot.slices <- function(s, res="slice", llike.min=NA, ylab='log likelihood'){

  s$settings <- s$load()

  N_GROUP <- sum(unlist(lapply(s$settings$parameters, function(x) {return(length(x$guess))})))
  sfrSplit(N_GROUP)

  for(partype in c('par_sv', 'par_proc', 'par_obs')){
    for(par in s$settings$orders[[ partype ]]){
      for(group in names(s$settings$parameters[[par]][['guess']])){
        plot.slice(s, res, par, group, llike.min=llike.min, ylab=ylab)
      }
    }
  }
}



###########################
##LHS
###########################


#' Plot the results of a Latin Hypercube Sampling design (LHS)
#'
#' @param s a settings object (obtained with \code{\link{get.settings}})
#' @param res the directory name (not a path) where the results of the lhs design can be found
#' @param navg integer Instead of plotting the log likelihood value of the last iteration, an average of the back last points will be used
#' @param par_sv logical Should the initial conditions be plotted
#' @param par_sv logical Should the parameter of the porcess model be plotted
#' @param par_sv logical Should the parameter of the observation process be plotted
#' @export
plot.prs <- function(s, res='lhs', navg=NA, par_sv=FALSE, par_proc=TRUE, par_obs=FALSE){

  
  path.design <- file.path(s$root,'results', res, 'design.des')

  if (file.exists(path.design)) {
    s$settings <- s$load()
    des <- read.table(path.design, header=TRUE)
    resbest <- NULL
    for(i in 1:nrow(des)) {
      mypath <- file.path(s$root, 'results', res, paste("best_", i-1, ".output", sep=''))
      best <- tryCatch(read.table(mypath, header=TRUE), error=function(e) t(as.matrix(rep(NA, ncol(des)+1))))
      if(!is.na(navg) & (navg <= nrow(best))){
          best <- apply(best[(nrow(best)-navg):nrow(best), 2:ncol(best)], 2, mean, na.rm=TRUE)
      } else {
          best <- best[nrow(best), 2:ncol(best)]
      }
      resbest <- rbind(resbest, best)      
    }

    ##trash what we don't want par_sv par_proc or par_obs AND sd_transf > 0.0
    keep <- NULL
    offset <- 1
    partype <- list('par_sv' = par_sv, 'par_proc' = par_proc, 'par_obs' = par_obs)
    for(ptype in names(partype)){
      for(par in s$settings$orders[[ ptype ]]){      
        for(group in s$settings$partition[[ s$settings$parameters[[par]][['partition_id']] ]][['group']]){
          if(partype[[ptype]] & (s$settings$parameters[[par]][['sd_transf']][[ group$id ]] > 0.0) ){
            keep <- c(keep, offset)
          }
          offset <- offset+1
        }
      }
    }    
    

    like <- c(rep(NA, nrow(des)), as.numeric(resbest[,ncol(resbest)]))  
    resbest <- resbest[,-ncol(resbest)]
    full <- rbind(as.matrix(des[,2:ncol(des)]),as.matrix(resbest))
  
    full <- full[,keep]
    
    ##trash first quantile
    keep <- (like>=summary(like)[2] | is.na(like))
    full <- full[keep,]
    like <- like[keep]

    ##color
    cols <- rep(NA, length(like))
    keep <- ((like>=summary(like)[5]) & !is.na(like))
    alpha <- rescale(like[keep], min(like[keep], na.rm=TRUE), max(like[keep], na.rm=TRUE), 0, 1)
    cols[keep] <- rgb(1,0,0, alpha=alpha)

    keep <- ((like<summary(like)[5]) & !is.na(like))
    alpha <- rescale(like[keep], min(like[keep], na.rm=TRUE), max(like[keep], na.rm=TRUE), 0, 0.4)
    cols[keep] <- rgb(0,0,1, alpha=alpha)
    
    pairs(full, pch=21, bg=cols, col=rgb(0.1,0.1,0.1,alpha=0.1))    
    
  } else {
    print (paste("could not find the design:", path.design))
  }

}




###########################
##Profiles
###########################


#' Helper function for likelihood profles plot
#'
#' @param s a settings object (obtained with \code{\link{get.settings}})
#' @param res the directory name (not a path) where the results of the profile design can be found
#' @param par the parameter name
#' @param group the group name
#' @param navg integer Instead of plotting the log likelihood value of the last iteration, an average of the back last points will be used
#' @param llike.min Every points whose log likelihood values is smaller that llike.min will be discarded
#' @param loess logical profiles are smoothed with a loess or a gam from the package mgcv
#' @param span in case of loess, the degree of smoothing
#' @return the profile object
#' @export
helper.profile <- function(s, res='profile', par, group, navg=0, llike.min=NA, loess=TRUE, span=0.75){

  path.design <- file.path(s$root, 'results', res, par, group, 'design.des')
  des <- read.table(path.design, header=TRUE)
  ##which column of the 1D design is variable ?
  ind.fixed <- which(apply(des, 2, function(x) !all(x == x[1])))[-1] - 1
  ind.like <- ncol(des)
  
  if(length(ind.fixed)>=1){ ##max != min
    
    profile <- NULL
    
    for(i in 1:nrow(des)){
      
      best <- tryCatch(read.table(file.path(s$root, 'results', res, par, group, paste("best_", i-1, ".output", sep='')), header=TRUE),
                       error = function(e) t(as.matrix(rep(NA, ncol(des)+1))))
      
      if((navg >0) & (navg <= nrow(best))){
        best <- as.numeric(apply(best[(nrow(best)-navg):nrow(best), 2:ncol(best)], 2, mean, na.rm=TRUE))
      } else {
        best <- as.numeric(best[nrow(best), 2:ncol(best)])
      }
      
      profile <- rbind(profile, unname(best))
    }
    
    if(!is.na(llike.min)){
      keep <- which(profile[,ind.like]>=llike.min)
    } else {
      keep <- 1:length(profile[,ind.like])
    }

    prof <- list()
    prof[['ind.fixed']] <- ind.fixed
    prof[['ind.like']] <- ind.like
    prof[['profile']] <- profile
    prof[['mle']] <- s$settings$parameters[[par]][['guess']][[group]]
    prof[['keep']] <- keep    

    y <- profile[keep, ind.like]

    if(!all(y == y[1])) { ##all values have the same log likelihood we do not smooth

      x.smooth=profile[keep, ind.fixed]
      x.smooth.interp <- seq(min(x.smooth,na.rm=TRUE), max(x.smooth,na.rm=TRUE), length=1000)
      x.smooth.interp <- data.frame(x.smooth=x.smooth.interp)
      
      if(loess){
        pred <- loess(y ~ x.smooth, span=span, control = loess.control(surface = "direct"))
        y.smooth <-predict(pred, newdata=x.smooth.interp, length=1000, se = TRUE)
      }else{
        pred <- gam(y ~ s(x.smooth))
        y.smooth <-predict(pred, newdata=x.smooth.interp, length=1000, se = TRUE, type="response")
      }    

      prof[['x.smooth.interp']] <- x.smooth.interp
      prof[['y.smooth']] <- y.smooth
      
      prof[['lower']] <- x.smooth.interp$x.smooth[y.smooth$fit>=max(y.smooth$fit)-1.92][1]
      prof[['upper']] <- x.smooth.interp$x.smooth[y.smooth$fit>=max(y.smooth$fit)-1.92][sum((y.smooth$fit>=max(y.smooth$fit)-1.92))]
      prof[['mleprof']] <- x.smooth.interp$x.smooth[y.smooth$fit>=max(y.smooth$fit)][1]
    }         
    return(prof)
    
    } else {
      return(NULL)
    }
}


#' Plot a likelihood profile
#'
#' @param s a settings object (obtained with \code{\link{get.settings}})
#' @param res the directory name (not a path) where the results of the profile design can be found
#' @param par the parameter name
#' @param group the group name
#' @param navg integer Instead of plotting the log likelihood value of the last iteration, an average of the back last points will be used
#' @param llike.min Every points whose log likelihood values is smaller that llike.min will be discarded
#' @param loess logical profiles are smoothed with a loess or a gam from the package mgcv
#' @param span in case of loess, the degree of smoothing
#' @param xlab custom label of the x axis
#' @export
plot.profile <- function(s, res='profile', par, group, navg=0, llike.min=NA, loess=TRUE, span=0.75, xlab=NULL){
  
  prof <- helper.profile(s=s, res=res, par=par, group=group, navg=navg, llike.min=llike.min, loess=loess, span=span)
  
  if(!is.null(prof)) {
    x <- prof[['profile']][prof[['keep']], prof[['ind.fixed']]]
    y <- prof[['profile']][prof[['keep']], prof[['ind.like']]]
    
    if(is.null(xlab)) xlab <- paste(paste(par,group,sep=':'))

    if("y.smooth" %in% names(prof)) {
      y.smooth <- prof[['y.smooth']]
      myylim <- c(min(y, y.smooth$fit -2*y.smooth$se, na.rm=TRUE), max(y, y.smooth$fit +2*y.smooth$se, na.rm=TRUE))
    } else {
      myylim <- c(min(y, na.rm=TRUE), max(y, na.rm=TRUE))
    }
    
    plot(x, y,
         type='p', xlab=xlab, ylab="log likelihood",
         mgp=c(2,1,0),
         ylim=myylim,
         pch=16)
    abline(v=prof[['mle']], col='skyblue', lty=2)

    if("y.smooth" %in% names(prof)) { ##all values have the same log likelihood we do not smooth
      x.smooth.interp <- prof[['x.smooth.interp']]
      lines(x.smooth.interp$x.smooth, y.smooth$fit, lty=1, col='grey')
      lines(x.smooth.interp$x.smooth, y.smooth$fit +2*y.smooth$se, lty=2, col='grey')
      lines(x.smooth.interp$x.smooth, y.smooth$fit -2*y.smooth$se, lty=2, col='grey')
      
      abline(h=max(y.smooth$fit)-1.92,lty=2)
      abline(v=prof[['lower']], lty=2) ##95%IC
      abline(v=prof[['upper']], lty=2) ##95%IC
      print(paste('-', xlab, ': lower: ', prof[['lower']], 'mle: ', prof[['mle']], 'upper: ', prof[['upper']]))
    } else {
      print(paste('-', xlab, ': mle: ', prof[['mle']]))
    }
    
  }
}


#' Plot the likelihood profiles of every parameters
#'
#' @param s a settings object (obtained with \code{\link{get.settings}})
#' @param res the directory name (not a path) where the results of the profile design can be found
#' @param navg integer Instead of plotting the log likelihood value of the last iteration, an average of the back last points will be used
#' @param llike.min Every points whose log likelihood values is smaller that llike.min will be discarded
#' @param loess logical profiles are smoothed with a loess or a gam from the package mgcv
#' @param span in case of loess, the degree of smoothing
#' @export
plot.profiles <- function(s, res='profile', navg=0, llike.min=NA, loess=TRUE, span=0.75){

  s$settings <- s$load()

  N_GROUP <- sum(unlist(lapply(s$settings$parameters, function(x) {return(length(x$guess))})))
  sfrSplit(N_GROUP)

  for(partype in c('par_sv', 'par_proc', 'par_obs')){
    for(par in s$settings$orders[[ partype ]]){
      for(group in names(s$settings$parameters[[par]][['guess']])){
        plot.profile(s, res, par, group, navg, llike.min, loess, span, NULL)
      }
    }
  }

}







#####################
#####################
#####################
#####################
#CURENTLY DEPRECIATED
#####################
#####################
#####################
#####################




######plot.mif <- function(path=sfrWorkingDir, id=0, m=1){
######  
######  ind_mif <- s$settings$iterators$par_proc_par_obs_no_drift$ind +1 #+1 because the iterator ind are C based index
######  
######  mif <- read.table(paste(path, "mif_", id, ".output", sep=''))
######  mif <- mif[mif[,1] == m ,]
######
######  n <- N_THETA_MIF +1 ##+1 for ess
######  sfrSplit(n)
######  
######  inddatanonan <- mif[, 2]
######
######  myess <- rep(NA, length(data$dates))
######  myess[inddatanonan] <- mif[, dim(mif)[2]]
######
######  plot(data$dates, myess, type='n', xlab='', ylab="ESS")
######  for(i in 1:N_TS)
######    lines(data$dates, rescale(data[[i+1]], min(data[[i+1]], na.rm=TRUE), max(data[[i+1]], na.rm=TRUE), min(myess, na.rm=TRUE), max(myess, na.rm=TRUE)), type='s', col=COL_DATA)
######  lines(data$dates, myess, type='s')
######
######  offset <- 1
######  for(i in ind_mif){
######    block <- mif[, (2+offset):(1+offset+2*sfrGroups[[i]])]
######    block.mean <- as.matrix(block[,seq(1,2*sfrGroups[[i]], by=2)])
######    block.sd <- as.matrix(sqrt(block[,seq(2,2*sfrGroups[[i]], by=2)]))
######
######    if(sfrGroups[[i]]>1){
######      mylim <- c(min(apply(block.mean-block.sd, 2, min, na.rm=TRUE)), max(apply(block.mean+block.sd, 2, max, na.rm=TRUE)))
######      cols.polygon <- rainbow(sfrGroups[[i]], alpha = 0.4)
######      cols <- rainbow(sfrGroups[[i]], alpha = 1)
######    } else{
######      mylim <- c(min(block.mean-block.sd, na.rm=TRUE), max(block.mean+block.sd, na.rm=TRUE))
######    }
######
######    myy <- rep(NA, length(data$dates))
######    myy.low <- rep(NA, length(data$dates))
######    myy.high <- rep(NA, length(data$dates))
######    myy[inddatanonan] <- block.mean[,1]
######    myy.low[inddatanonan] <- block.mean[,1] - block.sd[,1]
######    myy.high[inddatanonan] <- block.mean[,1] + block.sd[,1]
######
######    plot(data$dates, myy, type='n', ylab=paste(sfrNames.par[i], ' (transformed)'), ylim=mylim, xlab="")
######    polygon(c(data$dates, rev(data$dates)), c(myy.low, rev(myy.high)), col=rgb(0.74, 0.74, 0.74, alpha = 0.4), border=NA)
######    lines(data$dates, myy, type='l')
######    offset <- offset +2
######
######    if(sfrGroups[[i]]>1){
######      for(j in 2:sfrGroups[[i]]){
######
######        myy <- rep(NA, length(data$dates))
######        myy.low <- rep(NA, length(data$dates))
######        myy.high <- rep(NA, length(data$dates))
######        myy[inddatanonan] <- block.mean[,j]
######        myy.low[inddatanonan] <- block.mean[,j] - block.sd[,j]
######        myy.high[inddatanonan] <- block.mean[,j] + block.sd[,j]
######
######        polygon(c(data$dates, rev(data$dates)), c(myy.low, rev(myy.high)), col=cols.polygon[j], border=NA)
######        lines(data$dates, myy, col=cols[j], type='l')
######        offset <- offset +2
######      }
######    }
######  } 
######}
######
######
######
######plot.spectrum <- function(path=sfrWorkingDir, id=0, ts=0, period.range = c(0.3, 5)){
######
######    spec <- read.table(paste(path, "power_spectrum_", ts, "_", id, ".output", sep=''))
######    p <- 1/(spec[,1]*ONE_YEAR_IN_DATA_UNIT)
######    sel <- which(p<=period.range[2] & p>=period.range[1])
######    pmax <- floor(min(period.range[2], max(p[p<Inf], na.rm=TRUE)))
######
######    plot(p[sel], spec[sel,2], xlim=c(min(p), pmax), type='l', xlab="period(year)", ylab="",mgp=c(2,1,0))
######}
######
######
######plot.bif <-function(path=sfrWorkingDir, path_design="../../settings/1d.dat", ts=0, period.range = c(0.4, 6), plot.lyap=FALSE, background.fourrier=TRUE, threshold=log(2)){
######
######    des <- read.table(path_design)
######    ##which column of the 1D design is variable ?
######    ind <- which(apply(des, 2, function(x) !all(x == x[1])))
######    parname <- rep(sfrNames.par, unlist(sfrGroups))[ind]
######    groupid <- ind-c(0,cumsum(sfrGroups))[which(parname == sfrNames.par)]
######    myxlab <- paste(parname, ' / ', groupid-1, sep='')
######
######    period <- 1/(read.table(paste(path, "power_spectrum_",0, "_", 0, ".output", sep=''))[,1]*ONE_YEAR_IN_DATA_UNIT)
######    sel <- which(period<=period.range[2] & period>=period.range[1])
######    period <- period[sel]
######
######    sel <- sel[order(period)]
######    period <- sort(period)
######
######    par(mar=c(3,3,0.5,0.5))
######    if(plot.lyap){
######        layout(matrix(1:2,2,1), heights=c(0.7, 0.3))
######    }
######
######    if(background.fourrier){
######
######        four <- NULL
######        per <- rep(NA, dim(des)[1])
######        for(i in 1:dim(des)[1]){
######            spec <- read.table(paste(path, "power_spectrum_",ts, "_", i-1, ".output", sep=''))[sel,2]
######            four <- rbind(four, (spec-min(spec,na.rm=TRUE))/(max(spec,na.rm=TRUE) -min(spec,na.rm=TRUE)))
######            dyn <- read.table(paste(path, "period_",ts, "_", i-1, ".output", sep=''))[[1]]
######            per[i] <- which(dyn == dyn[dyn < threshold][1])[1]
######        }
######
######        image(des[,ind], period, -four, xlab=myxlab, ylab='period (years)', mgp=c(2,1,0), xaxs='i')
######        ##add dynamical system period
######        points(des[,ind], per, col='blue')
######
######    }else{
######
######        ##plot the trajectories rescaled in between 0 and 1
######        OFFSET_OBS <- 3+ N_PAR_SV*N_CAC
######        trajs <- NULL
######        for(i in 1:dim(des)[1]){
######            traj <- read.table(paste(path, "X_", i-1, ".output", sep=''))
######            trajs <- rbind(trajs, ((traj[, OFFSET_OBS+ts])-min(traj[, OFFSET_OBS+ts], na.rm=TRUE))/(max(traj[, OFFSET_OBS+ts], na.rm=TRUE)-min(traj[, OFFSET_OBS+ts], na.rm=TRUE)))
######        }
######        period <- 1:dim(trajs)[2]/ONE_YEAR_IN_DATA_UNIT
######        image(des[,ind], period, -trajs, xlab=myxlab, ylab="time (years)", mgp=c(2,1,0))
######
######    }
######
######
######    ##add max
######    bif <- NULL
######    for(i in 1:dim(des)[1]){
######        fmax <- tryCatch(read.table(paste(path, "max_",ts, "_", i-1, ".output", sep='')), error=function(e) 0)
######        if(is.data.frame(fmax)){
######            bif[[i]] <- fmax
######            bif[[i]][,1] <- log10(bif[[i]][,1])
######        } else{
######            bif[[i]] <- c(NA,NA)
######        }
######    }
######
######    bif.min <- min(sapply(bif, function(x) min(x[,1], na.rm=TRUE)), na.rm=TRUE)
######    bif.max <- max(sapply(bif, function(x) max(x[,1], na.rm=TRUE)), na.rm=TRUE)
######
######
######    for(i in 1:dim(des)[1]){
######        points(rep(des[i,ind], dim(bif[[i]])[1]), rescale(bif[[i]][,1], bif.min, bif.max, min(period, na.rm=TRUE), max(period, na.rm=TRUE)),  pch='.', cex=2)
######    }
######
######  ##add lyap
######  if(plot.lyap){
######    lyap <- NULL
######    for(i in 1:dim(des)[1]){
######      lyap <- rbind(lyap, read.table(paste(path, "lyap_", i-1, ".output", sep='')))
######    }
######
######    lyap.min <- max(-0.015, min(apply(lyap, 2, min, na.rm=TRUE)))
######    lyap.max <- max(apply(lyap, 2, max, na.rm=TRUE))
######
######    plot(des[,ind], lyap[,1], ylim=c(lyap.min, lyap.max), type='n', xlab=myxlab, ylab="Lyap. exp.", mgp=c(2,1,0), xaxs='i')
######    abline(h=0, lty=2, col='grey')
######    for(i in 1:dim(lyap)[2])
######      lines(des[,ind], lyap[,i],type='l')
######  }
######
######}
######
######
######
######plot.ff <- function(path="../../results/par_proc_r0_2_0/", path_design="../../par_proc_r0_2_0.dat", path_settings="../../settings.json", back=NA, llike.min=NA, loess=TRUE, span=0.75){
######
######    res <- get.profile(path=path, path_design=path_design, path_settings=path_settings, back=back, llike.min=llike.min, loess=loess, span=span)
######
######    ind <- 1:(dim(res$profile)[2]-1)
######    ind <- ind[-res$ind.fixed]
######
######    parname <- rep(sfrNames.par, unlist(sfrGroups))[res$ind.fixed]
######    groupid <- res$ind.fixed-c(0,cumsum(sfrGroups))[which(parname == sfrNames.par)]
######    myxlab <- paste(parname, ' / ', groupid-1, sep='')
######
######    par(mar=c(3,3,0.5,0.5))
######    n <- dim(res$profile)[2]-1
######    layout(matrix(1:(ceiling(sqrt(n))*round(sqrt(n))), round(sqrt(n)), ceiling(sqrt(n))))
######
######
######    for(i in ind){
######
######        parname <- rep(sfrNames.par, unlist(sfrGroups))[i]
######        groupid <- i-c(0,cumsum(sfrGroups))[which(parname == sfrNames.par)]
######        myylab <- paste(parname, ' / ', groupid-1, sep='')
######
######        plot(res[['profile']][res[['keep']], res[['ind.fixed']]], res[['profile']][res[['keep']], i],
######             type='p', xlab=myxlab, ylab=myylab,
######             mgp=c(2,1,0),
######             pch=16)
######        abline(v=res[['mle']][res[['ind.fixed']]], col='skyblue', lty=2)
######
######        abline(v=res[['lower']], lty=2) ##95%IC
######        abline(v=res[['upper']], lty=2) ##95%IC
######    }
######}
######
######
######
######
######
######
######plot.pred <- function(path="../../results/pred/"){
######  ##all 3d
######  require('scatterplot3d')
######
######  N_DATA <- dim(data)[1]
######  N_PRED <- dim(read.table(paste(path, "X_0.output", sep='')))[1]
######  x.extended <- 1:N_PRED
######  ##cuts:
######  OFFSET_OBS <- 3+ N_PAR_SV*N_CAC
######  OFFSET_DRIFT <- OFFSET_OBS + N_TS
######
######  trajs = list()
######  for(n in 1:N_DATA){
######    X <- read.table(paste(path, "X_", n-1, ".output", sep=''))
######    trajs[[n]] <- data.frame(X[, OFFSET_OBS:(OFFSET_DRIFT-1) ])
######  }
######
######
######  par(mar=c(3,3,0.5,0.5))
######  n <- N_TS
######  layout(matrix(1:(ceiling(sqrt(n))*round(sqrt(n))), round(sqrt(n)), ceiling(sqrt(n))))
######
######  for(i in 1:N_TS){
######
######    ##start with data
######    data.extended <-  c(data[[i+1]], rep(NA, N_PRED-N_DATA))
######    myp3d <- scatterplot3d(x.extended, seq(N_PRED-1, 0), data.extended,
######                           color=rgb(1,0,0,0.5),
######                           xlim=c(0,N_PRED-1),
######                           ylim=c(N_PRED-N_DATA,N_PRED-1),
######                           angle=90,
######                           grid=FALSE,
######                           type='l',
######                           box=FALSE,
######                           xlab='',
######                           ylab='',
######                           zlab=SfrName.ts[i],
#######                           scale.y=4,
######                           axis=FALSE,
######                           mar=c(0,0,0,0))
######
######    ##add data on the background
######    myp3d$points3d(x.extended, rep(N_PRED-1, N_PRED), data.extended,
######                   col=rgb(1,0,0,0.5), type='l')
######
######    ##add predicted traj
######    for(n in 1:N_DATA){
######      myp3d$points3d(x.extended[n:N_PRED], rep(N_PRED-n, length(trajs[[n]][,i])), trajs[[n]][,i], type='l', col=rgb(0,0,0,0.1))
######    }
######
######  }
######
######}
######
######
######plot.convergence <- function(path="../../bin/lhs/", len.design=1, auto.like=FALSE, back=1){
######  
######  res <- NULL
######  for(i in 1:len.design){
######      best <- tryCatch(read.table(paste(path, "best_", i-1, ".output", sep='')), error=function(e) t(as.matrix(rep(NA, dim(des)[1]+1))))
######      res[[i]] <- best
######  }
######
######  ind.like <- dim(res[[1]])[2]
######
######  all.like <- as.vector(unlist(sapply(res, function(x) x[, ind.like])))
######
######  s <- summary(all.like)
######  if(auto.like){
######      myylim <- c(s[5], s[6]) ##plot values above 3rd quantile
######      helper <- function(x){
######          if(!all(is.na(x))){
######              if(max(x[, ind.like], na.rm=TRUE) >= myylim[1]){
######                  return(dim(x)[1])
######              }
######          }
######             return(NA)
######      }
######      x.length <- unlist(sapply(res, helper ))
######      myxlim <- c(0, max(x.length, na.rm=TRUE))
######  } else {
######      myylim <- c(s[1], s[6])
######      x.length <- unlist(sapply(res, function(x) dim(x)[1]))
######      myxlim <- c(0, max(x.length, na.rm=TRUE))
######  }
######
######  cols <- rainbow(len.design)
######  
######  plot(res[[1]][,1], res[[1]][, ind.like],
######       type='n',
######       col=cols[1],
######       xlim=myxlim,
######       ylim=myylim,
######       xlab="#iteration",
######       ylab="log likelihood")
######  offset <- 1
######  for(r in res){
######    offset <-  offset+1
######    lines(r[,1], r[, ind.like], col=cols[offset])
######  }
######
######  avg.res <- do.call(rbind, lapply(res, function(x) {apply(x[(nrow(x)-back):nrow(x), 2:ncol(x)], 2, mean, na.rm=TRUE)}))
######  print(order(avg.res[,ind.like-1])-1)
######  
######}
######
######
######plot.corr <- function(path="../../results/lhs/", path_design="../../settings/lhs.dat"){
######    require(corrgram)
######
######    des <- read.table(path_design)
######
######    res <- NULL
######    for(i in 1:dim(des)[1]){
######        best <- tryCatch(read.table(paste(path, "best_", i-1, ".output", sep='')), error=function(e) t(as.matrix(rep(NA, dim(des)[1]+1))))
######        best <- best[dim(best)[1], 2:dim(best)[2]]
######        res <- rbind(res,best)
######    }
######
######    ##we keep only the relatively good points (log like > 3rd quantile)
######    ind.like <- dim(res)[2]
######    llike <- res[,ind.like]
######    s <- summary(llike)
######    keep <- which(llike>=s[5])
######
######    res <- as.data.frame(res[keep, 1:(dim(res)[2]-1)]) ##drop likelihood
######    parname <- rep(sfrNames.par, unlist(sfrGroups))
######    names(res) <- parname
######    #drop non variable par
######    ind <- which(apply(res, 2, function(x) !all(x == x[1])))
######    res <- res[,ind]
######
######    corrgram(res, order=TRUE, lower.panel=panel.ellipse,
######             upper.panel=panel.pie, text.panel=panel.txt,
######             main="LHS results in PC2/PC1 Order")
######}
######
######
######get.best <- function(path="../../results/lhs/", path_design="../../settings/lhs.dat", nrep=1, dim.design, back=NA){
######  res <- NULL
######  for(i in 1:dim.design[1]) {
######      best <- tryCatch(read.table(paste(path, "best_", i-1, ".output", sep='')), error=function(e) t(as.matrix(rep(NA, dim.design[2]+1))))
######      
######      if(!is.na(back) & (back <= dim(best)[1])){
######          best <- apply(best[(dim(best)[1]-back):dim(best)[1], 2:dim(best)[2]], 2, mean, na.rm=TRUE)
######      } else {
######          best <- best[dim(best)[1], 2:dim(best)[2]]
######      }      
######      res <- rbind(res,best)
######  }
######  return(res)
######}
######
######
######plot.endpoints <- function(path="../../results/lhs/", path_design="../../settings/lhs.dat", nrep=1, back=0, auto.like=TRUE){
######
######  des <- read.table(path_design)
######  des.min <- apply(des,2, min, na.rm=TRUE)
######  des.max <- apply(des,2, max, na.rm=TRUE)
######
######  res <- get.best(path=path, path_design=path_design, nrep=nrep, dim.design=dim(des), back=NA)
######
######  ind.like <- dim(res)[2]
######
######  ind.mle <- which(res[,ind.like] == max(res[,ind.like], na.rm=TRUE))
######
######  s <- summary(res[,ind.like])
######  if(auto.like){
######      myylim <- c(s[5], s[6]) ##plot values above 3rd quantile
######  } else {
######      myylim <- c(s[1], s[6])
######  }
######
######  par(mar=c(3,3,0.5,0.5))
######  n <- sum(sfrGroups)
######  layout(matrix(1:(ceiling(sqrt(n))*round(sqrt(n))), round(sqrt(n)), ceiling(sqrt(n))))
######
######  offset <- 1
######  for(partype in c('par_sv','par_proc', 'par_obs')){
######    for(parname in s$settings$orders[[ partype ]]){
######      for(group in 0:max(s$settings$parameters[[ parname ]][[ 'grouping' ]])){
######          myxlab <- paste(parname, ' / ', group, sep='')
######
######          x <- res[,offset]
######          xkeep <- x[res[,ind.like]>=myylim[1]]
######
######          plot(res[,offset], res[, ind.like],
######               xlim=c(min(des.min[offset], xkeep, na.rm=TRUE), max(des.max[offset], xkeep, na.rm=TRUE)),
######               ylim=myylim,
######               xlab=myxlab,
######               ylab="log likelihood",
######               mgp=c(2,1,0))
######          abline(v=des.min[offset], lty=2, col='red')
######          abline(v=des.max[offset], lty=2, col='red')
######
######          for(m in ind.mle){
######              points(res[m, offset], res[m, ind.like], pch='.', col='blue')
######              text(res[m, offset], res[m, ind.like], m-1, col='red')
######          }
######
######          offset <- offset+1
######      }
######    }
######  }
######  
######  print(paste("best index:", ind.mle-1, sep=" "), quote=FALSE)
######  print(order(res[,ind.like])-1)
######
######}


# There are 16 groups
##for(i in 1:16){
##  result <- try(read.table('deded'), silent = TRUE);
##  if(class(result) == "try-error") next;  
##}

