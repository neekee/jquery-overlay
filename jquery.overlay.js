/*!
 * jQuery.textoverlay.js
 *
 * Repository: https://github.com/yuku-t/jquery-textoverlay
 * License:          MIT
 * Original Author:  Yuku Takahashi
 * Modifying Authors: Niki Castle, Nick Willett-Jeffries
 *
 * This version is from https://github.com/nwj/jquery-overlay/tree/master, which introduces support for
 * strategies that match using multiple regexes.
 *
 * It includes modifications introduced in https://github.com/neekee/jquery-overlay/tree/master to get this
 * working for input fields and resizeable textareas, and to allow nested matching.
 *
 */

;(function ($) {

  'use strict';

  /**
   * Get the styles of any element from property names.
   */
  var getStyles = (function () {
    var color;
    color = $('<div></div>').css(['color']).color;
    if (typeof color !== 'undefined') {
      return function ($el, properties) {
        return $el.css(properties);
      };
    } else {  // for jQuery 1.8 or below
      return function ($el, properties) {
        var styles;
        styles = {};
        $.each(properties, function (i, property) {
          styles[property] = $el.css(property);
        });
        return styles;
      };
    }
  })();

  var entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };

  var entityRegexe = /[&<>"'\/]/g;

  /**
   * Function for escaping strings to HTML interpolation.
   */
  var escape = function (str) {
    if (typeof str !== 'undefined'){
      return str.replace(entityRegexe, function (match) {
        return entityMap[match];
      });
    }
  };

  /**
   * Determine if the array contains a given value.
   */
  var include = function (array, value) {
    var i, l;
    if (array.indexOf) return array.indexOf(value) != -1;
    for (i = 0, l = array.length; i < l; i++) {
      if (array[i] === value) return true;
    }
    return false;
  };

  var Overlay = (function () {

    var html, css, textareaToWrapper, textareaToOverlay, allowedProps;

    html = {
      wrapper: '<div class="textoverlay-wrapper"></div>',
      overlay: '<div class="textoverlay"></div>'
    };

    css = {
      wrapper: {
        margin: 0,
        padding: 0,
        overflow: 'hidden'
      },
      overlay: {
        position: 'absolute',
        color: 'transparent',
        'white-space': 'pre-wrap',
        'word-wrap': 'break-word'
      },
      textarea: {
        background: 'transparent',
        position: 'relative',
        outline: 0
      }
    };

    // CSS properties transport from textarea to wrapper
    textareaToWrapper = ['display'];
    // CSS properties transport from textarea to overlay
    textareaToOverlay = [
      'margin-top',
      'margin-right',
      'margin-bottom',
      'margin-left',
      'padding-top',
      'padding-right',
      'padding-bottom',
      'padding-left',
      'font-family',
      'font-weight',
      'font-size',
      'background-color'
    ];

    function Overlay($textarea) {
      var $wrapper, position;

      // Setup wrapper element
      position = $textarea.css('position');
      if (position === 'static') position = 'relative';
      $wrapper = $(html.wrapper).css(
        $.extend({}, css.wrapper, getStyles($textarea, textareaToWrapper), {
          position: position
        })
      );

      // Setup overlay
      this.textareaTop = parseInt($textarea.css('border-top-width'));
      this.textareaLeft = parseInt($textarea.css('border-left-width'));
      this.$el = $(html.overlay).css(
        $.extend({}, css.overlay, getStyles($textarea, textareaToOverlay), {
          top: this.textareaTop,
          right: parseInt($textarea.css('border-right-width')),
          bottom: parseInt($textarea.css('border-bottom-width')),
          left: parseInt($textarea.css('border-left-width'))
        })
      );

      // Setup textarea
      this.$textarea = $textarea.css(css.textarea);

      // Add styles that depend on which type of input field this is attached to
      if ($textarea.is("input[type='text']")) {
        this.$el.css('white-space', 'nowrap');
        $wrapper.addClass("with-input");
        if ($textarea.css('width') == "100%") {
          $wrapper.css('width', "100%");
        }
        if ($textarea.css('margin-right')) {
          var marginRight = $textarea.css('margin-right');
          $textarea.css('margin-right', '0');
          $wrapper.css('margin-right', marginRight);
        }
      } else if ($textarea.is("textarea")) {
        $wrapper.addClass("with-textarea");
        $textarea.css('margin', 0);
        $textarea.css('overflow-y', 'scroll');
        this.$el.css('margin', 0);
      }

      // Render wrapper and overlay
      this.$textarea.wrap($wrapper).before(this.$el);

      // Intercept val method
      // Note that jQuery.fn.val does not trigger any event.
      this.$textarea.origVal = $textarea.val;
      this.$textarea.val = $.proxy(this.val, this);

      // Bind event handlers
      this.$textarea.on({
        'input.overlay':       $.proxy(this.onInput,       this),
        'change.overlay':      $.proxy(this.onInput,       this),
        'scroll.overlay':      $.proxy(this.resizeOverlay, this),
        'resize.overlay':      $.proxy(this.resizeOverlay, this),
        'keydown.overlay':     $.proxy(this.resizeOverlay, this),
        'keyup.overlay':       $.proxy(this.resizeOverlay, this),
        'focus.overlay':       $.proxy(this.resizeOverlay, this),
        'blur.overlay':        $.proxy(this.resizeOverlay, this),
        'click.overlay':       $.proxy(this.resizeOverlay, this),

        // These events should technically be covered by events above, but fixes issues where
        // the events weren't firing correctly in different browsers. See each event for event and browser(s).
        // See https://github.com/neekee/jquery-overlay/issues/5 for more information.
        'wheel.overlay':       $.proxy(this.resizeOverlay, this), // Overlaps with "scroll". Chrome, Opera
        'DOMFocusOut.overlay': $.proxy(this.resizeOverlay, this)  // Overlaps with "blur". Chrome, Opera, Safari
      });

      this.strategies = [];
    }

    $.extend(Overlay.prototype, {
      val: function (value) {
        return value == null ? this.$textarea.origVal() : this.setVal(value);
      },

      setVal: function (value) {
        this.$textarea.origVal(value);
        this.renderTextOnOverlay();
        return this.$textarea;
      },

      onInput: function (e) {
        this.renderTextOnOverlay();
        this.resizeOverlay();
      },

      renderTextOnOverlay: function () {
        var text, i, l, strategy, matches, style, textContent, html, prevIndex, indexStringPairs;
        text = $('<div></div>').text(this.$textarea.val());

        // Helper method. Given matches and text to match against, returns all substrings that match, and an
        // index in the original text where each of those substrings begins.
        function matchIndexStringPairs(matches, text) {
          var indexStringPairs;
          indexStringPairs = [{index: 0, string: text}];
          matches.forEach(function(match) {
            var nextIndexStringPairs;
            nextIndexStringPairs = [];
            indexStringPairs.forEach(function(pair) {
              var matchedGroups, matchedString;
              while ((matchedGroups = match.exec(pair.string)) !== null) {
                matchedString = matchedGroups[0];
                nextIndexStringPairs.push({index: pair.index + match.lastIndex - matchedString.length, string: matchedString});
              }
            });
            indexStringPairs = nextIndexStringPairs;
          });
          return indexStringPairs;
        }

        // Apply all strategies
        for (i = 0, l = this.strategies.length; i < l; i++) {
          strategy = this.strategies[i];

          // matching strategies are coerced to an array of one or more RegExps
          matches = strategy.match;
          if (!this.allowMultiPartMatching && $.isArray(matches)) {
            matches = $.map(matches, function (str) {
              return str.replace(/(\(|\)|\|)/g, '\$1');
            });
            matches = new RegExp('(' + matches.join('|') + ')', 'g');
          }
          if (!$.isArray(matches)) {
            matches = [matches];
          }
          if (this.allowMultiPartMatching) {
            matches = $.map(matches, function(match) {
              if ($.type(match) === "string") {
                return new RegExp(match, 'g');
              } else {
                return match;
              }
            });
          }

          // Style attribute's string
          style = Object.keys(strategy.css).map(function(propCSS) {
            return propCSS + ': ' + strategy.css[propCSS];
          }).join(';');

          // Set up highlighting
          if (this.allowOverlapping) {
            // Allow matching within an overlay that may already have been applied for another strategy
            // Get the current html (including overlays added by previous strategies)
            textContent = text.html();
            html = '';
            indexStringPairs = matchIndexStringPairs(matches, textContent);
            prevIndex = 0;
            indexStringPairs.forEach(function(pair) {
              html += textContent.substr(prevIndex, pair.index - prevIndex);
              html += '<span style="' + style + '">' + pair.string + '</span>';
              prevIndex = pair.index + pair.string.length;
            });
            html += textContent.substr(prevIndex);
            text.html(html);
          } else {
            // Application of each strategy splits the string into individual nodes; consequent strategies are applied to each node
            text.contents().each(function () {
              var text, html, prevIndex, indexStringPairs;
              if (this.nodeType != Node.TEXT_NODE) return;
              text = this.textContent;
              html = '';
              indexStringPairs = matchIndexStringPairs(matches, text);
              prevIndex = 0;
              indexStringPairs.forEach(function(pair) {
                html += text.substr(prevIndex, pair.index - prevIndex);
                html += '<span style="' + style + '">' + escape(pair.string) + '</span>';
                prevIndex = pair.index + pair.string.length;
              });
              html += escape(text.substr(prevIndex));
              $(this).replaceWith(html);
            });
          }
        }
        this.$el.html(text.contents());
        return this;
      },

      resizeOverlay: function () {
        this.$el.css({ top: this.textareaTop - this.$textarea.scrollTop() });
        this.$el.css({ left: this.textareaLeft - this.$textarea.scrollLeft() });
        if (this.$textarea.is("textarea")) {
          this.$el.css({ width: this.$textarea.width() - parseInt(this.$textarea.css('padding-left')) - parseInt(this.$textarea.css('padding-right')) });
          this.$el.css({ 'padding-right': this.$textarea.width() - this.$el.width() + parseInt(this.$textarea.css('padding-right'))});
        }
      },

      register: function (strategies, opts) {
        strategies = $.isArray(strategies) ? strategies : [strategies];
        this.strategies = this.strategies.concat(strategies);
        if (this.allowOverlapping == null) {
          this.allowOverlapping = opts.allowOverlapping;
        }
        if (this.allowMultiPartMatching == null) {
          this.allowMultiPartMatching = opts.allowMultiPartMatching;
        }
        return this.renderTextOnOverlay();
      },

      destroy: function () {
        var $wrapper;
        this.$textarea.off('.overlay');
        $wrapper = this.$textarea.parent();
        $wrapper.after(this.$textarea).remove();
        this.$textarea.removeData('overlay');
        this.$textarea = null;
      }
    });

    return Overlay;

  })();

  $.fn.overlay = function (strategies, opts) {
    var dataKey;
    dataKey = 'overlay';
    if (opts == null) {
      opts = {};
    }

    if (strategies === 'destroy') {
      return this.each(function () {
        var overlay = $(this).data(dataKey);
        if (overlay) { overlay.destroy(); }
      });
    }

    return this.each(function () {
      var $this, overlay;
      $this = $(this);
      overlay = $this.data(dataKey);
      if (!overlay) {
        overlay = new Overlay($this);
        $this.data(dataKey, overlay);
      }
      overlay.register(strategies, opts);
    });
  };

})(window.jQuery);
