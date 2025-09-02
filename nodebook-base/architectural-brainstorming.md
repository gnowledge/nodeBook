# What is the best architecture for nodebook-base? 

hypercore is giving interoperability pain. we did not succeed in getting hyperdrive work for media files, which made us to move to a simple file system for media, while using hypercore for graphs. this disturbed the requirement of all data being available in a p2p + federated architecture. hypercore worked in the dev environemnt, but not in the deployment, despite using docker at both places. This may become a painpoint for wider use, since we have no idea where and in which OS they will be using our App. we are committed interoperability. 

Considering the pain of unsuccessful attempts, I am initiating this thread to arrive a a good stable library that can give longer and stable model. 

# What are our requirements?

1. CNL Editor is the heart of the matter of nodeBook, a markdown editor that supports live collaboration, similar to HedgeDoc. Extended to build graphs in addition to writing text. This is the kind of frontend requirement. HedgeDoc kind of interface is best suited for the frontend, but not for the backend, since HedgeDoc uses traditional client-server model for collaboration. 

2. What we need in the backend, nodebook-base? 

version control of the markdown files only, since nodeBook uses markdown (using CNL format, which is a valid md file) as the single source of truth.  and the processed graph as a json file, which doesn't have to be part of the vcs. schema to validate the graphs in json, when the user wants a strict mode.  manifesto file either in yml or json. media files.   All of them packed together for exchange as a graph.ndf (a zip archive). 

3. Why do we need a pubsub architecture?

We want the teachers, students and researchers (our end users will be primarliy academic) to live collaboration with a simple chat panel at the editor layer, just like HedgeDoc. 

4. what we want to protect in the existing implementation? 

The CNL processing that we have implemented is an impressive achievement, and is working very well to the satisfaction of many users I tried with. the demonstration had a magical effect, when they saw a simple text file can generate a complex graph processing abilities supporting nodes, relations, attributes, transitions, and functions. 

In summary, we need a federated auth feature on top of a filesharing among peers.  The vision is a HedgeDoc kind of collaborative editor with pubsub authentication that does processing of CNL in markdown format. 

The question is 1. what can be the best architecture for nodebook-base microservice? 2. pub/sub integration 3. frontend collaboration as in HedgeDoc or etherpad. 