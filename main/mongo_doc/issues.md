PLoM Issues
===========

{
	from:
	type:
	comment: {
		from:
		date:
		body:
		}
	status:
}

from
====

The username (user_id)

type
====

The type of request, either
	-data (e.g. time series of incidence HFMD in Japan)
	-metadata (e.g. weekly population size and birth and death rates)
	-question (e.g. Will vaccination work for HFMD?)
	-model (e.g. Does an S-I-R-S explain the data better than an S-I-R model?)

models are types of questions and can be posted to answer questions.  
data can be posted to answer a data request
metadata can be posted to answer a metadata request

comment
=======

This is the bulk of the issue, it contains a brief description of the request 
and matches the selected tag.  A comment contains additional descriptors:
	-from, the user_id
	-date, a timestamp of when the comment was made
	-body, the text containing the description of the request
	
potentially restrict characters to keep issues as concise as possible

status
======

The current status of the request and whether it has been closed successfully or not
The possible options for status are:
	-open, as in still pending an answer or data, depending on the request
	-closed_success, as in an answer was posted that fufilled the original request
	-closed_fail, as in an answer was either posted but did not fulfill the original request or an answer was not posted at all
	


	