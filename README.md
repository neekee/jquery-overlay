# Simple Decorator for Textarea

[Demo](http://yuku-t.com/jquery-overlay)

## How to Use

```js
$('textarea').overlay(strategies, options);
```

`strategies` MUST be an Array of Object.

```js
strategies = [strategy];
```

Each `strategy` MUST have `match` and `css` properties.

```js
strategy = {
  match: matchObject,
  css: cssObject
};
```

`matchObject` MUST be a RegExp, a String or an Array of either. When it is a RegExp, it SHOULD include 'g' flag.

```js
matchObject = 'abc';  // every 'abc' match
matchObject = /\B@\w+/g; // every word starting with @ match

// For arrays, without allowMultiPartMatching:
matchObject = ['a', 'b', 'c'];  // every 'a' 'b' and 'c' match

// For arrays, with allowMultiPartMatching, each strategy in the array is applied to the results of the prior strategy, in left to right order.
matchObject = ['/\{.*\}/', 'abc']; // every 'abc' that occurs within '{' and '}' match
```

`cssObject` MUST be an Object. It controls the style of boxes which are put under the matching strings in the textarea.

```js
cssObject = {
  'background-color': 'gray',
  'border': 'solid 1 #555'
};
```

Options MUST be an Object (if passed at all). Valid options (shown with default values below) include:

```js
options = {
  allowOverlapping: false,  // allows multiple strategies to overlap each other and apply overlapping overlays
  allowMultiPartMatching: false  // changes how strategies that use arrays of matches are interpreted (see details above)
};
```

## Todo

- Auto resizing textarea

## License

Licensed under the MIT License
