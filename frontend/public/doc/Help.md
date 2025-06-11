# NDF-Studio Help

Welcome to NDF-Studio! This page provides guidance on using the app, CNL syntax, and modeling best practices.

## Getting Started

- Use the **Knowledge Base** tab to create and edit your knowledge graphs.
- Use the **Score Card** to see your modeling progress and rubric.
- Refer to the **Preferences** tab to customize your experience.
- For CNL syntax, see the block templates in the editor toolbar.
- For more, see the project README or documentation.


## Screenshots

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

## **Difficulty Levels**

* 🟢 **Easy:** Only the basics—no quantifier, qualifier, adverb, or modality.
* 🟡 **Medium:** Add qualifiers (e.g. adjectives), but still no quantifier or modality.
* 🟠 **Advanced:** Add quantifiers (e.g. *all*, *some*).
* 🔴 **Expert:** Full power—add adverbs (how), and modality (uncertainty/possibility).

---

## **Node Syntax (Section Titles)**

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
