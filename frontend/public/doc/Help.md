
# NDF-Studio 

Welcome to NDF-Studio! 

We developed this node-taking (pun on note-taking :-) application with an assumption that *knowledge is a network*. Natural language masks this network, by breaking it into words, sentences and documents. This application helps you to see what is behind that mask. 

The App is created like an document editor, but the document will become a graph as you start working. We re-represent our knowledge into a graph.  By graph we mean representing our knowledge into terms and relations.  We use grammatical structure that we arleady know, and move from there to reveal the network structure of our knowledge. 

# Getting Started

* Create a "New Graph" from the File menu. 
* Use the prominent **Add Node** button to start your journey. A node can be any topic, say "Democracy", or "Classical Music",  "Photosynthesis" or "Chemical Reaction". 
* You will see a card with the term name, inviting you to relate it to other cards, that is other nodes/terms. 
* Once you make some relations, you can see ore cards on the page.
* Each card is the workplace, where you take notes. Write something as description of the topic.
* If you don't want to write, you can use the prominent **Generate Summary** button.  The App will talk to an AI agent (a small language model) that will try to fill some text.  The text will not appear immediately.  It may take a mintue or so, depending on how fast the machine is. 
* You can switch between the tabs: **Graph** or **Node Book**.
* At the moment, before you get to know what we are upto, do not use **CNL Edit** tab.  
* The App may look like a *concept mapping* app, or *mind map*, but soon you will see that it is not them, but certainly an extension of them.
* In this App we don't hide anything.  In fact you can have direct peek into how the files are stored. Click on the **Under the hood**, to see how the data is stored, and what else is being done by the App.
* All data is stored in plain text, no proprietary or binary format. Your work is safe and the files you create cannot be infected by any computer virus. This also ensures inter-operability (working betweeen people and machines) seamlessly. We will soon provde export, import options. 
* You can try **Parse** button, which will be activated only when you have some text in the Node's description. You get two options. Select one of them and see what the App does. We use NLP (natural language processor) to parse (decode) the the natural language sentences into parts of speach and into some logical units. Since this is done by a computer program, use these results to continue your journey. 
* Once in a while, do look at the ScoreCard.  We provide a commulative Scorecard on the top tab, and a Node Book level score in the **Stats** tab, whicHTML
h you can find in the **Under the hood** tab. 
* The other Tab called **CNL Edit** is to build your Node Book using CNL (Controlled Natural Language). As you keep working on the system from the **Node Book** interface, you will get to know how what is CNL and how you can graduate to use that. 
* This App is like a game. Your job in the game is to convert natural langauge sentences into a graph. When you re-represent most text into a graph, you win. 
* The rubric used in the scorecard will let you know how to gain more score. 
* Unlike in **Concept Mapping**, where you are allowed to use any relation name between nodes/concepts, in this App you are deliberately constrained to use only the defined set of relations and attributes. Once you learn how to define more, you can extend the limited set with which you start. 
* You gain more score if you use less number of relation names and attribute names to build all your knowledge. More economical you are with the predicate terms, more rigorous (least ambiguous) your langauge becomes.
* Refer to the **Preferences** tab to customize your experience.


# Screenshots

<!-- Place screenshots here. Example: -->

![Knowledge Base Tab](./screenshots/knowledge_base.png)
![Score Card Tab](./screenshots/score_card.png)

Absolutely! Here’s a **markdown-formatted CNL Help Guide**, complete with **difficulty level annotations** for each feature.
This is designed for direct use in your Help component.

---

# **Controlled Natural Language (CNL) Syntax Guide**

Welcome to the CNL Help! This guide explains how to write clear, structured scientific assertions using CNL blocks in NDF-Studio.

**Each level builds on the previous.**

---

# **Difficulty Levels**

* 🟢 **Easy:** Only the basics—no quantifier, qualifier, adverb, or modality.
* 🟡 **Medium:** Add qualifiers (e.g. adjectives), but still no quantifier or modality.
* 🟠 **Advanced:** Add quantifiers (e.g. *all*, *some*).
* 🔴 **Expert:** Full power—add adverbs (how), and modality (uncertainty/possibility).

---

# **Node Syntax (Section Titles)**

Write your node titles with optional markup for quantifiers and qualifiers.

| Syntax                                | Example                           | Difficulty  |
| ------------------------------------- | --------------------------------- | ----------- |
| base\_node                            | `mathematicians`                  | 🟢 Easy     |
| **qualifier** base\_node              | `**female** mathematicians`       | 🟡 Medium   |
| *quantifier* base\_node               | `*all* mathematicians`            | 🟠 Advanced |
| *quantifier* **qualifier** base\_node | `*all* **female** mathematicians` | 🟠 Advanced |
| (All combined)                        | `*some* **ancient** philosophers` | 🔴 Expert   |

* *Italic* = **quantifier** (e.g., *all*, *some*, *at least 3*)
* **Bold** = **qualifier** (e.g., **female**, **ancient**)
* Plain = **base node**

---

## **Relations (Inside `:::cnl` blocks)**

Express how nodes are related using relations.
Use these markup conventions:

| Syntax Example                                 | Explanation                 | Difficulty  |
| ---------------------------------------------- | --------------------------- | ----------- |
| `<relation> target_node`                       | Basic relation              | 🟢 Easy     |
| `<relation> **qualified** target_node`         | With qualifier              | 🟡 Medium   |
| `<relation> *all* target_node`                 | With quantifier             | 🟠 Advanced |
| `++adverb++ <relation> target_node`            | With adverb (how)           | 🔴 Expert   |
| `<relation> target_node [modality]`            | With modality (uncertainty) | 🔴 Expert   |
| `++adverb++ <relation> target_node [modality]` | Adverb + modality           | 🔴 Expert   |

**Markups Used:**

* `++underline++` = **adverb** (e.g., ++quickly++, ++rarely++)
* `[square brackets]` = **modality** (e.g., \[probably], \[uncertain], \[estimated])
* `<angle brackets>` = **relation** (e.g., \<competes\_with>, <causes>)
* The **target\_node** itself can use the node markup above.

**Examples:**

```markdown
<discovered> natural selection                # 🟢 Easy
<discovered> **Darwinian** theory            # 🟡 Medium
<discovered> *all* theories                  # 🟠 Advanced
++rapidly++ <spreads> infection              # 🔴 Expert
<causes> disease [possibly]                  # 🔴 Expert
++quickly++ <competes_with> rivals [probably]# 🔴 Expert
```

---

## **Attributes (Inside `:::cnl` blocks)**

Assign properties to nodes using attribute statements.

| Syntax Example                                         | Explanation         | Difficulty  |
| ------------------------------------------------------ | ------------------- | ----------- |
| `has size: 50 *microns*`                               | Attribute with unit | 🟢 Easy     |
| `has shape: **spherical**`                             | With qualifier      | 🟡 Medium   |
| `has size: *all* 10 *microns*`                         | With quantifier     | 🟠 Advanced |
| `has growth_rate: ++rapidly++ 5 *cm/year*`             | With adverb         | 🔴 Expert   |
| `has lifespan: 70 *years* [uncertain]`                 | With modality       | 🔴 Expert   |
| `has growth_rate: ++rapidly++ 5 *cm/year* [uncertain]` | Adverb + modality   | 🔴 Expert   |

**Markups Used:**

* `has <attribute>:` = Attribute name (always required)
* `++underline++` = **adverb** (e.g., ++rapidly++)
* *italic* = **unit** (e.g., *microns*, *kg*, *years*)
* `[square brackets]` = **modality** (e.g., \[uncertain], \[estimated])
* **Bold** = **qualifier** for attribute values if desired (optional)

## **Examples:**

```markdown
has size: 50 *microns*                        # 🟢 Easy
has name: **scientific** method               # 🟡 Medium
has count: *all* 12                           # 🟠 Advanced
has growth_rate: ++rapidly++ 5 *cm/year*      # 🔴 Expert
has lifespan: 70 *years* [uncertain]          # 🔴 Expert
```

---

## **Parsing Steps (for Each Assertion)**

1. **Node Title**

   * *Italic* at start → quantifier
   * **Bold** at start → qualifier
   * Remaining text → base node

2. **Relation Assertion**

   * If starts with `++...++` → adverb
   * Next, `<relation>` in angle brackets
   * Remaining, up to final `[modality]`, is target node (parse using node syntax)
   * If ends with `[modality]` → modality

3. **Attribute Assertion**

   * Starts with `has <attribute>:`
   * If value starts with `++...++` → adverb
   * Next, value (plain text)
   * If next is *italic* → unit
   * If ends with `[modality]` → modality

---

## **JSON Mapping**

| CNL Field   | JSON Key   | Example Value    |
| ----------- | ---------- | ---------------- |
| Quantifier  | quantifier | "all"            |
| Qualifier   | qualifier  | "female"         |
| Base Node   | base       | "mathematicians" |
| Adverb      | adverb     | "quickly"        |
| Modality    | modality   | "probably"       |
| Relation    | name       | "competes\_with" |
| Target Node | target     | "rival\_species" |
| Attribute   | name       | "growth\_rate"   |
| Value       | value      | "5"              |
| Unit        | unit       | "cm/year"        |

---

## **Quick Reference Table**

| Feature    | Markup        | Difficulty  | Example                      |
| ---------- | ------------- | ----------- | ---------------------------- |
| Quantifier | *italic*      | 🟠/🔴       | *all* mathematicians         |
| Qualifier  | **bold**      | 🟡/🟠/🔴    | **female** mathematicians    |
| Adverb     | ++underline++ | 🔴          | ++rarely++ <visits> humans   |
| Modality   | \[brackets]   | 🔴          | <causes> disease \[possibly] |
| Unit       | *italic*      | 🟢/🟡/🟠/🔴 | has mass: 5 *kg*             |

---

**Tip:**

* 🟢 Start simple!
* 🟠/🔴 Try advanced features for richer meaning and expert modeling.

---

**For more help or examples, see the full documentation or try the visual editor!**

---

For more help or examples, see the full documentation or try the visual editor!

---

_This help page is static and can be updated by developers. To update, edit `frontend/public/doc/Help.md` in the repo._
