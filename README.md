# Simple Decorator for Textarea

[Demo](http://yuku-t.com/jquery-overlay)

## How to Use

```js
$('textarea').overlay(strategies);
```

`strategies` MUST an Array of Object.

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

`matchObject` MUST be a RegExp, a String or an Array of String. When it is a RegExp, it SHOULD include 'g' flag.

```js
matchObject = 'abc';  // every 'abc' match
matchobject = ['a', 'b', 'c'];  // every 'a' 'b' and 'c' match
matchObject = /\B@\w+/g; // every words start with @ match
```

`cssObject` MUST be an Object. It controls the style of boxes which are put under the matching strings in the textarea.

```js
cssObject = {
  'background-color': 'glay',
  'border': 'solid 1 #555'
};
```

## Todo

- Auto resizing textarea

## License

Licensed under the MIT License
