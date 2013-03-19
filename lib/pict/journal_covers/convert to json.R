jcv<-read.csv("~/plom.io/lib/pict/journal_covers/journal_data.csv")

jlist<-list()
for(i in 1:nrow(jcv)){
	jlist[[i]]<-c(Publisher=as.character(jcv[i,3]),
	Journal=as.character(jcv[i,1]),
	IF=as.numeric(jcv[i,2]),
	Image=as.character(jcv[i,4]))
}

write(toJSON(jlist),"~/plom.io/lib/pict/journal_covers/journal_data_list.JSON")
write(toJSON(jcv),"~/plom.io/lib/pict/journal_covers/journal_data.JSON")
