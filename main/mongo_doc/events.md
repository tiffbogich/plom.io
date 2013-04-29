PLoM Events
===========


    {
      from:
      type:
      option:
      name:
      preview:
      context_id:
      process_id:
      link_id:
      user_id:
      review_id:
      discussion_id:
      comment_id:
    }


from
====

The username (user_id)

type and option
===============

- review
    - accepted
    - rejected
    - revised_accepted (revised to accepted)
    - revised_rejected
    - contested_accepted (contested to accepted)
    - contested_rejected
    - commented
- follow
    - user
    - context
- unfollow
    - user
    - context
- fork (an user clicked on the fork button. He might not have done anything then). If the user do something with his fork, a create event will be triggered
- create
    - context
    - model
    - theta
- view (Not implemented for now: someone requested the review page of a model, the context follower are notified)
- discuss_pmodel
- discuss_omodel
- discuss_prior

name
====

A name is defined with:

    context.disease.join('; ') + ' / ' +  context.name + ' / ' + process.name + ' - ' + link.name


_id
===

Each event store (when appropriate)

- user_id different of ```from``` (usefull for ```follow``` event)
- comment_id (the index of the comment in the review.comment array)

preview
=======

140 character preview of the body or description field
