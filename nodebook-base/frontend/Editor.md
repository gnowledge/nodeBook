# CNL Editor
Controlled Natural Language (CNL) Editor used in nodeBook is a valid markdown editor with a difference. 

The base text is a restricted markdown editor customized for CNL, while the full featured markdown editor inside the description code blcoks. 

The text is parsed by cnl-parser, while the description blocks are rendered by UI into standard HTML as marked up by markdown. 

For the description blocks we will use a full featured standard mardown format, including insertion of links and images, supported by the floating menu.  If possible, let the floating menu be placed above the line where the block begins, and moves down as the user scrolls down. 

CNL base text editor will have a non-floating Menu at the top of the CNLEditor, supporting the special requirements.  It will have buttons to insert based on the context of where the cursor position is:

    - when the cursor is in the first row, first column describes the graph mode in a commented text

<! MindMap Mode: contains>
    or   
   <! RichGraph Mode: Easy> 

Possible options for RichGraph: Easy|Moderate|Graduate|Expert

The user can set the default value from Preferences. 

	- The CNL Fixed Menu will have buttons to insert
		- Insert Section Heading autocompletion suggestions for NodeTypes only, selected NodeTypes inserted in [Person, Student] 
		- Insert Description block just below the section heading, in this context the menu has WordNet Definition button
		- Relation: inserts a typical relation template
			<is a> TargetNode; for Easy
			adverb, adjective, quantfier, and modalities will be insertable for Expert
			adverb, adjective, quantfier for Graduate
			adverb, adjective for Moderate
			None for Easy
			
			Context based suggestions based on the position of the cursor, it is possible since CNL's syntax is limited and well defined.
			
		- Similarly for Attribute: 
			has in the beginning of the line should trigger attribute types list from the schema 
			attributes will have adverb, 
			
			
	- At the first column of each line the auto completion suggestions can be: # | < | has (only three options)
	

While editing it is desirable to have dynamic syntax check, and if
each line is valid, it will use syntax highlighting.  no syntax
highlighting if the sentence is CNL invalid. This will give a visual
feedback to the user. 

Despite this check, the first cycle of cnl processing must check if
the file has any syntax errors, and should point out the errors
pointing to the line numbers. Just we do in software langauges. 

If the user chooses strict mode, after syntax validation, user will be
told if there are undefined schema elements used in the document.
Default mode: strict mode is Off.


