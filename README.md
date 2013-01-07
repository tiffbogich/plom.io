PLoM.io: Toward Social Modeling
===============================

Presenting the results of a modeling work to other modelers,
data-providers, decision makers, or citizens often leads to the same
reaction: a lot of questions about how the results would
have differed if some of the hypotheses were
altered. For instance, in epidemiology some people might wonder what
the results would have been had the modelers included an exposed
class to their models, or whether a control policy would have been more
efficient if a treatment was used instead of a vaccine.

All these questions can be answered by customizing the original
model. One could argue that this should be a relatively easy
task. However if you take a modeling paper (even if the source code is
available) and try to add these new features to the model, you will
soon realize that this is indeed a time consuming and error prone
effort. The main reason is that the _semantic_ of the model, its very
definition that you wanted to alter, is hidden behind its
_implementation_.  Indeed most of the time, to "extend" previous
results modelers find it easier to re-implement everything using their
toolkit and programming language of choice. In this context, decision
makers and citizens have no recourse other than to turn back to the
modeler with their questions.

PloM.io aims to make modeling _social_:

1. allowing users to **share** models' **semantics** (as opposed to
   implemented models).

2. allowing users to _easily_ **customize** and **re-use** existing
   models' **semantics**.

3. supporting the development of vibrant **heterogeneous communities**
   using modeling as a common language to collaboratively generate and
   test hypotheses.

4. offering the tools necessary to rate models. Rating relies on users
   votes but also on the use of
   [likelihood based criteria](http://en.wikipedia.org/wiki/Likelihood)
   when data are available.


A few years ago, such an approach would have been mostly
irrelevant. The main reason was that very few statistical methods for
complex mechanistic models were generic (i.e. could be applied to _any_
models). On the contrary, modelers had to rely on model-specific
features to be able to implement relevant statistical methods. The
recent development of _plug-and-play_ statistical methods, e.g.
[MIF](http://www.pnas.org/content/103/49/18438.abstract)] and
[pMCMC](http://onlinelibrary.wiley.com/doi/10.1111/j.1467-9868.2009.00736.x/abstract),
finally offers the perspective of generic inference tools for
arbitrary complex mechanistic models (as opposed to linear models).

For the first time most scientific questions related to mechanistic
modeling of complex systems (prospective modeling, dynamical system
analysis, or inference) can be tackled by using algorithms that rely
on a **black box representation** of the model that can be produced
from a simple definition of the model semantic.

PLoM.io is the first open source initiative to coordinate the
development of:

1. domain-specific **layered formal grammars** for model semantic
   definitions (allowing to define models as data).

2. efficient (adapted to multi-core architecture and distributed
   computing) methods to implement and use these models.

3. a modern web platform to support social modeling and facilitate the
   interaction with models running the cloud from any device with a web
   browser.


Model semantic as domain specific **layered formal grammars**
=============================================================

We want to lower the barrier of entry to modeling by letting users
compose models by simply describing the underlying processes using
some domain specific **layered formal grammars**. These grammars
should be as intuitive as possible and should not require any
programming knowledge.

By **layered** formal grammar we mean that _modularity_ should be the
primary focus: For instance in epidemiology, a model of an infection
process should be separated from a model describing spatial migration
of individuals. By keeping each layer separate, each component can be
re-used. It is the role of the grammar to ensure that a final model
can be assembled from its atomic components.

A user should be able to simply pick up and compose a model from
existing components cataloged in a fully searchable library of
_semantic models_.

These domain specific layered formal grammars should be as simple as
possible (ideally described as a simple short README file) and expressed
in [JSON](http://json.org).

JSON:

- is easy for humans to read and write.

- maps directly to data structures (array and hash table) that are
  suitable to **automate** model generation using the user programming
  language of choice (JSON parsers for virtually any programming
  language exist). This ease of use allows the development of third-party _domain specific languages_ to automate the mass generation
  of complex models or related model _families_.

- fits naturally with most NoSQL databases allowing users to perform queries
  on the model definition itself. Taking epidemiology as an example, a
  user can therefore query all the models containing a transition from
  an exposed state to an infectious state.

- doesn't allow comments. We see that as a main strength for our
  goals. The grammar has to specify mandatory (or optional) _comment_
  (or _description_) properties. This allows model definitions to have
  a consistent style, and it gives us an incentive to enforce ideas--
  similar to _literate programming_.

- makes [diff](http://en.wikipedia.org/wiki/Diff) between two
  documents easy to understand.

- provides great API endpoints both for web services and for the
  implementation of low-level simulation and inference methods.


Model implementation and tooling following the UNIX philosophy
==============================================================

We want to catalyze an ecosystem of **generic** methods (working with
_any_ models) that can interact with each other leveraging simple
_universal_ API for inputs and outputs (in JSON). Using an API for
inputs and outputs allows users to combine these tools (that can be written
in different programming languages) using their programming
language of choice.

Most plug-and-play statistical methods are computationally intensive
and require significant development time. Given the lack of universal
API for model generation, we believe that there were very few
incentives for the development of carefully optimized algorithms
adapted to distributed computing. It is our hope that PLoM.io will
change this situation and create the incentive for collaborative
development of plug-and-play inference algorithms.

Leveraging the real-time web
============================




Example
=======

[PLoM.io](https://github.com/plom) provides a full proof of principle
of these ideas for the field of Epidemiology.

License
=======

GPL version 3 or any later version.
