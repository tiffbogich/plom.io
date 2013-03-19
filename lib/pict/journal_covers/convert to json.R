jcv<-read.csv("~/Dropbox/Tiff Laptop Files/Plom_Files/website/journal_covers/journal_data.csv")

jlist<-list()
for(i in 1:nrow(jcv)){
	jlist[[i]]<-c(Publisher=as.character(jcv[i,3]),
	Journal=as.character(jcv[i,1]),
	IF=as.numeric(jcv[i,2]),
	Image=as.character(jcv[i,4]))
}

write(toJSON(jlist),"~/Dropbox/Tiff Laptop Files/Plom_Files/website/journal_covers/journal_data_list.JSON")
write(toJSON(jcv),"~/Dropbox/Tiff Laptop Files/Plom_Files/website/journal_covers/journal_data.JSON")
