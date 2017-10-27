# Sherlock

A reactive programming library for JavaScript applications, built with TypeScript.

## Introduction

> I'm Sherlock, the world's best deduction expert.
>
> I'm not going to go into detail about how I do what I do because chances are you wouldn't understand.
>
> This is what I do:
>
> 1. I observe mutable state *(**`Atoms`**)*
> 2. From what I observe, I deduce everything else. *(**`Derivations`**)*
> 3. I don't glitch, my deductions are always correct and up to date, and I'm really fast!

*[Adapted from: [The Science of Deduction](http://www.thescienceofdeduction.co.uk/)]*

Special thanks to @ds300 for creating [derivablejs](https://github.com/ds300/derivablejs) which was the main inspiration for Sherlock. Sherlock was originally designed to be API compatible with derivablejs, but has been rewritten from the ground up (in TypeScript) to address a number of fundamental issues that prevented its use in our projects. See [Differences with derivablejs](#differences-with-derivablejs) for more information.

## Concepts

Sherlock Holmes, the fictional consulting detective, is known for his power of deduction. Given a number of truths (or clues or observations), he can deduce other truths (or theories).

Take this example from "*Silver Blaze*," one of his adventures. Holmes deduces that the perpetrator of the crime must have been someone familiar to the household, because the dog didn't bark when the perpetrator approached.

> **Inspector:** "Is there any point to which you would wish to draw my attention?"
>
> **Holmes:** "To the curious incident of the dog in the night-time."
>
> **Inspector:** "The dog did nothing in the night-time."
>
> **Holmes:** "That was the curious incident."

### Application state
The Sherlock library applies the power of deduction (or derivation) to application state. This is best explained using a small example. Let's say we're developing an eBook reader (to read about Sherlock Holmes of course). Our naive version is as follow:

```typescript
/** Calculates an array of pages (['Title page...', 'page 1...', ...]). */
function calculatePages(book: Book, fontsize: number): string[] { /* secret internal code. ;-) */ }

// Initialisation:
let currentBook: Book; // magicly appears
let currentFontSize = 12;
let currentPageNumber = 0;
let currentPages = calculatePages(currentBook, currentFontSize);
let currentPage = currentPages[currentPageNumber];

updateScreen();

function selectPage(pageNr: number) {
    currentPageNumber = pageNr;
    currentPage = currentPages[currentPageNumber];
    updateScreen();
}

function selectFontSize(newSize: number) {
    currentFontSize = newSize;
    currentPages = calculatePages(book, currentFontSize);
    currentPage = currentPages[currentPageNumber];
    updateScreen();
}
```

Here we can observe two kinds of variables. The first kind contains the real mutable state of the application, that is:
- `currentBook`
- `currentFontSize`
- `currentPageNumber`

The rest of the variables is derived state:
- `currentPages`
- `currentPage`

The derived state can be derived (deduced) from the real state. As you can see in this example, we need to make sure to always update the derived state whenever the real state changes. If, for example, we forget to update `currentPages` after changing `currentFontSize` we end up with an invalid state.

Another way to explain the difference betwee real state and derived state is to look at the way a spreadsheet works. Any cell in a spreadsheet that contains a value contains *real state*, any cell that contains a formula contains *derived state*. A spreadsheet is very powerful like that because it automatically updates formula-cells whenever needed. Wouldn't it be nice to have that power in our code as well?

Another thing we can see in the eBook code is that this magic `updateScreen` function needs to be called whenever `currentPage` changes.

### The power of deduction
The idea behind Sherlock (and other reactive libraries) is to make all derivations *(i.e. calculating derived state)* and reactions *(calling some function whenever something changes)* explicit and automatic.

All real state is put in so-called Atoms, all other state is derived. An Atom has a `get` and a `set` method to access or change its state. Using Sherlock, the code could look as follows *(the dollor-suffix is a syntactic indication that a variable has been "sherlocked", i.e. that a variable is derivable)*:

```typescript
/** same as before */
function calculatePages(book: Book, fontsize: number): string[] { /* secret internal code. ;-) */ }

// Initialisation:
let currentBook$: Atom<Book>; // magicly appears
let currentFontSize$ = atom(12);
let currentPageNumber$ = atom(0);
// We simply use a lambda function to define currentPage$ as a derivation of currentBook$
// and currentFontSize$ using calculatePages. Sherlock automatically records all dependencies.
let currentPages$ = derivation(() => calculatePages(currentBook$.get(), currentFontSize$.get()));
// currentPage$ is always equal to the element in currentPages$ at position currentPageNumber$.
let currentPage$ = currentPages$.pluck(currentPageNumber$);

// Automatically call updateScreen whenever neccessary.
currentPage$.react(() => updateScreen());

function selectPage(pageNr: number) {
    currentPageNumber$.set(pageNr);
}

function selectFontSize(newSize: number) {
    currentFontSize$.set(newSize);
}
```

The initial setup is slightly more complex, because we make all dependencies explicit at initialisation time, but the `selectPage` and `selectFontSize` functions have suddenly become preposterously simple. Wouldn't you agree?

## Derivables

The base concept of Sherlock is the *Derivable*. A *Derivable* is a piece of application state that can be combined and used to derive other pieces of application state.

There are three types of Derivables:

- **Atoms**

    Atoms are the basic building blocks of a reactive application. They are mutable references to immutable values. Atoms represent the ground truth from which the rest of the application state is derived.

    ```typescript
    import { atom, Atom } from '@politie/sherlock';

    const name$: Atom<string> = atom('Sherlock');

    name$.get(); // => 'Sherlock'

    name$.set('Moriarty');

    name$.get(); // => 'Moriarty'
    ```

- **Constant**

    Constants are simple immutable references to immutable values.

    ```typescript
    import { constant, Derivable } from '@politie/sherlock';

    const emptyString$: Derivable<string> = constant('');

    emptyString$.get(); // => ''
    ```

- **Derivations**

    Derivations are calculated derived state (deductions if you will) based on other Atoms of Derivations. They can be created with the `#derive` method that is present on all derivables.

    ```typescript
    const cyber = (word: string) => word.toUpperCase().split('').join(' ');

    const isBrilliant$ = name$.derive(name => name === 'Sherlock');

    isBrilliant$.get(); // false

    name$.set('Sherlock');

    isBrilliant$.get(); // true
    ```

    Derivations can also be created with the generic `derivation` function as seen above. This function can be used to do an arbitrary calculation on any number of derivables. `@politie/sherlock` automatically records which derivable is dependent on which other derivable to be able to update derived state when needed.

## Reactors

To execute side effects, you can react to changes on any derivable as seen in an earlier example.

*More documentation coming soon*

## Immutable

@politie/sherlock should be used in combination with immutable data structures such as the excellent [Immutable](https://facebook.github.io/immutable-js/) library by Facebook.

## Differences with derivablejs
### Fixes to the change propagation algorithm
*Coming soon*
### Cyclic reactors
*Coming soon*
