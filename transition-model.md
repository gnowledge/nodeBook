# Transition (Declarative)

Transition shows prior-state of nodes and their state on one side, and
post-state of nodes on the other side; and prior state also includes
the conditions for the transition. Conditions are necessary and
sufficient conditions required for the transition to take place. they
could be more than one node. Similarly the post-state can also be more
than one node.

Since a polynode (polymmorphic node) is a node with more than one
possible morph, it is the same node that is changing, therefore, we
cannot give a new ids except the name change; e.g. oxygen becomes
oxide ion after gaining two more electrons.




# Hydrogen [Element]
```description
A chemical element with symbol H and atomic number 1.
```
has number of protons: 1;
has number of electrons: 1;
has number of neutrons: 0;

## Hydrogen ion
has number of protons: 1;
has number of neutrons: 0;
has number of electrons: 0;
<part of> Water;
## Hydrogen isotope
has number of protons: 1;
has number of neutrons: 1;
has number of electrons: 1;

# Oxygen [Element]
```description
A chemical element with symbol O and atomic number 8.
```
has number of protons: 8;
has number of neutrons: 8;
has number of electrons: 8;

## Oxide ion
has number of protons: 8;
has number of neutrons: 8;
has number of electrons: 10;
<part of> Water;

# Water [Class]
```description
A substance composed of the chemical elements hydrogen and oxygen and existing in gaseous, liquid, and solid states.
```
<is a type of> Substance;
<is a type of> Molecule;
has chemical formula: $\ce{H2O}$; 
## hydronium
has chemical formula: $\ce{H3O+}$;
## hydroxide
has chemical formula: $\ce{OH-}$;

# Electrolysis of Water [Transition]
```description
The process of using electricity to decompose water into oxygen and hydrogen gas.
```
## priorState

- Water:basic;
- **high voltage** Electricity;

## postState

- Hydrogen:basic;
- Oxygen:basic ;

# Combustion [Transition]
```description
A rapid reaction between hydrogen and oxygen that produces water.
```
## prior-state
- Hydrogen:basic;
- Oxygen: basic;
- Spark|Flame;

## post-state
- Water;

# Spark [Energy]
```description
A electric spark 
```

# Flame [Energy]
```description
A burning fuel producing high amount of heat
```
