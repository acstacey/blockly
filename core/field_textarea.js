/**
 * @license
 * Visual Blocks Editor
 *
 * Copyright 2012 Google Inc.
 * https://developers.google.com/blockly/
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
 
/**
 * @fileoverview Text input field.
 * @author primary.edw@gmail.com (Andrew Mee) based on work in field_textinput by fraser@google.com (Neil Fraser)
 */
'use strict';

goog.provide('Blockly.FieldTextArea');

goog.require('Blockly.Field');
goog.require('Blockly.Msg');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.TagName');
goog.require('goog.userAgent');


/**
 * Class for an editable text field.
 * @param {string} text The initial content of the field.
 * @param {Function=} opt_validator An optional function that is called
 *     to validate any constraints on what the user entered.  Takes the new
 *     text as an argument and returns either the accepted text, a replacement
 *     text, or null to abort the change.
 * @extends {Blockly.Field}
 * @constructor
 */
Blockly.FieldTextArea = function(text, opt_validator) {
  Blockly.FieldTextArea.superClass_.constructor.call(this, text,
      opt_validator);
  this.setText(text);
};
goog.inherits(Blockly.FieldTextArea, Blockly.Field);

/**
 * Point size of text.  Should match blocklyText's font-size in CSS.
 */
Blockly.FieldTextArea.FONTSIZE = 11;

/**
 * The HTML input element for the user to type, or null if no FieldTextArea
 * editor is currently open.
 * @type {HTMLInputElement}
 * @private
 */
Blockly.FieldTextArea.htmlInput_ = null;

/**
 * Mouse cursor style when over the hotspot that initiates the editor.
 */
Blockly.FieldTextArea.prototype.CURSOR = 'text';

/**
 * Allow browser to spellcheck this field.
 * @private
 */
Blockly.FieldTextArea.prototype.spellcheck_ = true;

/**
 * Close the input widget if this input is being deleted.
 */
Blockly.FieldTextArea.prototype.dispose = function() {
  Blockly.WidgetDiv.hideIfOwner(this);
  Blockly.FieldTextArea.superClass_.dispose.call(this);
};

/**
 * Set the value of this field.
 * @param {?string} newValue New value.
 * @override
 */
Blockly.FieldTextArea.prototype.setValue = function(newValue) {
  if (newValue === null) {
    return;  // No change if null.
  }
  if (this.sourceBlock_) {
    var validated = this.callValidator(newValue);
    // If the new value is invalid, validation returns null.
    // In this case we still want to display the illegal result.
    if (validated !== null) {
      newValue = validated;
    }
  }
  Blockly.Field.prototype.setValue.call(this, newValue);
};

/**
 * Set the text in this field and fire a change event.
 * @param {*} newText New text.
 */
Blockly.FieldTextArea.prototype.setText = function(newText) {
  if (newText === null) {
    // No change if null.
    return;
  }
  newText = String(newText);
  if (newText === this.text_) {
    // No change.
    return;
  }

  this.text_ = newText;
  
  // Replace whitespace with non-breaking spaces so the text doesn't collapse.
  if (Blockly.RTL && newText) {
    // The SVG is LTR, force text to be RTL.
    newText += '\u200F';
  }
  if (!newText) {
    // Prevent the field from disappearing if empty.
    newText = Blockly.Field.NBSP;
  }
  
  var y=2; //initial y position
  
  this.textElement_ = Blockly.utils.createSvgElement('text',
      {'class': 'blocklyText', 'y': this.size_.height - 12.5},
      this.fieldGroup_);
  var lines = newText.split(/\n/);
  for (var i = 0; i < lines.length; ++i) {
      var line = lines[i] + '\n';
      //line = line.replace(/\s/g, Blockly.Field.NBSP);
      var tspan = Blockly.utils.createSvgElement('tspan', {x:0,y:y}, this.textElement_)
      tspan.appendChild(document.createTextNode(line));
      y += 20;
  }
//   newText.split(/\n/).map(function(textline){
// 	  textline = textline.replace(/\s/g, Blockly.Field.NBSP);
// 		var tspan = Blockly.utils.createSvgElement('tspan', {x:0,y:y}, that.textElement_)
// 			  .appendChild(document.createTextNode(textline));
// 		y+=20;
//   });
  
    // Cached width is obsolete.  Clear it.
  this.size_.width = 0;

  if (this.sourceBlock_ && Blockly.Events.isEnabled()) {
    Blockly.Events.fire(new Blockly.Events.BlockChange(
        this.sourceBlock_, 'field', this.name, this.text_, newText));
  }
  //Blockly.Field.prototype.setText.call(this, newText);
};

/**
 * Set whether this field is spellchecked by the browser.
 * @param {boolean} check True if checked.
 */
Blockly.FieldTextInput.prototype.setSpellcheck = function(check) {
  this.spellcheck_ = check;
};

/**
 * Draws the border with the correct width.
 * Saves the computed width in a property.
 * @private
 */
Blockly.FieldTextArea.prototype.render_ = function () {
    if (!this.visible_) {
        this.size_.width = 0;
        return;
    }

    this.updateWidth();
    // this.size_.width = this.textElement_.getBBox().width + 5;

    // this.size_.height = (this.text_.split(/\n/).length || 1) * 20 + (Blockly.BlockSvg.SEP_SPACE_Y + 5);

    // if (this.borderRect_) {
    //     this.borderRect_.setAttribute('width',
    //         this.size_.width + Blockly.BlockSvg.SEP_SPACE_X);
    //     this.borderRect_.setAttribute('height',
    //         this.size_.height - (Blockly.BlockSvg.SEP_SPACE_Y + 5));
    // }
    // this.sourceBlock_.render();

};

/**
 * Show the inline free-text editor on top of the text.
 * @param {boolean=} opt_quietInput True if editor should be created without
 *     focus.  Defaults to false.
 * @private
 */
Blockly.FieldTextArea.prototype.showEditor_ = function (opt_quietInput) {
    this.workspace_ = this.sourceBlock_.workspace;
    var quietInput = opt_quietInput || false;
    if (!quietInput && (goog.userAgent.MOBILE || goog.userAgent.ANDROID ||
        goog.userAgent.IPAD)) {
        this.showPromptEditor_();
    } else {
    this.showInlineEditor_(quietInput);
  }
};

/**
 * Create and show a text input editor that is a prompt (usually a popup).
 * Mobile browsers have issues with in-line textareas (focus and keyboards).
 * @private
 */
Blockly.FieldTextArea.prototype.showPromptEditor_ = function() {
  var fieldText = this;
  Blockly.prompt(Blockly.Msg.CHANGE_VALUE_TITLE, this.text_,
    function(newValue) {
      if (fieldText.sourceBlock_) {
        newValue = fieldText.callValidator(newValue);
      }
      fieldText.setValue(newValue);
    });
};

/**
 * Create and show a text input editor that sits directly over the text input.
 * @param {boolean} quietInput True if editor should be created without
 *     focus.
 * @private
 */
Blockly.FieldTextArea.prototype.showInlineEditor_ = function(quietInput) {
  Blockly.WidgetDiv.show(this, this.sourceBlock_.RTL, this.widgetDispose_());
  var div = Blockly.WidgetDiv.DIV;
  // Create the input.
  var htmlInput = goog.dom.createDom(goog.dom.TagName.INPUT, 'blocklyHtmlInput');
  var fontSize = (Blockly.FieldTextArea.FONTSIZE * this.workspace_.scale) + 'pt';
  div.style.fontSize = fontSize;
  htmlInput.style.fontSize = fontSize;
  //htmlInput.style.resize = 'none';
  htmlInput.style['line-height'] = '20px';
  //htmlInput.style.height = '100%';

  Blockly.FieldTextArea.htmlInput_ = htmlInput;
  
  div.appendChild(htmlInput);

  htmlInput.value = htmlInput.defaultValue = this.text_;
  htmlInput.oldValue_ = null;
  this.validate_();
  this.resizeEditor_();
  if (!quietInput) {
    htmlInput.focus();
    htmlInput.select();
  }

  this.bindEvents_(htmlInput);
};

/**
 * Bind handlers for user input on this field and size changes on the workspace.
 * @param {!HTMLInputElement} htmlInput The htmlInput created in showEditor, to
 *     which event handlers will be bound.
 * @private
 */
Blockly.FieldTextArea.prototype.bindEvents_ = function(htmlInput) {
  // Bind to keydown -- trap Enter without IME and Esc to hide.
  //htmlInput.onKeyDownWrapper_ =
      //Blockly.bindEventWithChecks_(htmlInput, 'keydown', this,
      //this.onHtmlInputKeyDown_);
  // Bind to keyup -- trap Enter; resize after every keystroke.
  htmlInput.onKeyUpWrapper_ =
      Blockly.bindEventWithChecks_(htmlInput, 'keyup', this,
      this.onHtmlInputChange_);
  // Bind to keyPress -- repeatedly resize when holding down a key.
  htmlInput.onKeyPressWrapper_ =
      Blockly.bindEventWithChecks_(htmlInput, 'keypress', this,
      this.onHtmlInputChange_);
  htmlInput.onWorkspaceChangeWrapper_ = this.resizeEditor_.bind(this);
  this.workspace_.addChangeListener(htmlInput.onWorkspaceChangeWrapper_);
};

/**
 * Unbind handlers for user input and workspace size changes.
 * @param {!HTMLInputElement} htmlInput The html for this text input.
 * @private
 */
Blockly.FieldTextArea.prototype.unbindEvents_ = function(htmlInput) {
  //Blockly.unbindEvent_(htmlInput.onKeyDownWrapper_);
  Blockly.unbindEvent_(htmlInput.onKeyUpWrapper_);
  Blockly.unbindEvent_(htmlInput.onKeyPressWrapper_);
  this.workspace_.removeChangeListener(
      htmlInput.onWorkspaceChangeWrapper_);
};

/**
 * Handle key down to the editor.
 * @param {!Event} e Keyboard event.
 * @private
 */
Blockly.FieldTextArea.prototype.onHtmlInputKeyDown_ = function(e) {
  var htmlInput = Blockly.FieldTextArea.htmlInput_;
  var tabKey = 9, enterKey = 13, escKey = 27;
  if (e.keyCode == escKey) {
      htmlInput.value = htmlInput.defaultValue;
      Blockly.WidgetDiv.hide();
  }
//   if (e.keyCode == enterKey) {
//     Blockly.WidgetDiv.hide();
//   } else if (e.keyCode == escKey) {
//     htmlInput.value = htmlInput.defaultValue;
//     Blockly.WidgetDiv.hide();
//   } else if (e.keyCode == tabKey) {
//     Blockly.WidgetDiv.hide();
//     this.sourceBlock_.tab(this, !e.shiftKey);
//     e.preventDefault();
//   }
};

/**
 * Handle a change to the editor.
 * @param {!Event} e Keyboard event.
 * @private
 */
Blockly.FieldTextArea.prototype.onHtmlInputChange_ = function (
    /* eslint-disable no-unused-vars */ e /* eslint-enable no-unused-vars */) {
    var htmlInput = Blockly.FieldTextArea.htmlInput_;
    if (e.keyCode == 27) {
        // Esc
        this.setText(htmlInput.defaultValue);
        Blockly.WidgetDiv.hide();
    } else {
        // Update source block.
        var text = htmlInput.value;
        if (text !== htmlInput.oldValue_) {
            htmlInput.oldValue_ = text;
            this.setText(text);
            this.validate_();
        } else if (goog.userAgent.WEBKIT) {
            // Cursor key.  Render the source block to show the caret moving.
            // Chrome only (version 26, OS X).
            this.sourceBlock_.render();
        }
        this.resizeEditor_();
    }
    Blockly.svgResize(this.sourceBlock_.workspace);
};

/**
 * Check to see if the contents of the editor validates.
 * Style the editor accordingly.
 * @private
 */
Blockly.FieldTextArea.prototype.validate_ = function() {
  var valid = true;
  goog.asserts.assertObject(Blockly.FieldTextArea.htmlInput_);
  var htmlInput = Blockly.FieldTextArea.htmlInput_;
  if (this.sourceBlock_) {
    valid = this.callValidator(htmlInput.value);
  }
  if (valid === null) {
    Blockly.utils.addClass(htmlInput, 'blocklyInvalidInput');
  } else {
    Blockly.utils.removeClass(htmlInput, 'blocklyInvalidInput');
  }
};

/**
 * Resize the editor and the underlying block to fit the text.
 * @private
 */
Blockly.FieldTextArea.prototype.resizeEditor_ = function() {
  var div = Blockly.WidgetDiv.DIV;
  //var bBox = this.fieldGroup_.getBBox();
  var bBox = this.getScaledBBox_();
  div.style.width = bBox.width + 'px';
  div.style.height = bBox.height + 'px';

  // In RTL mode block fields and LTR input fields the left edge moves,
  // whereas the right edge is fixed.  Reposition the editor.
  var x = this.sourceBlock_.RTL ? bBox.right - div.offsetWidth : bBox.left;
  var xy = new goog.math.Coordinate(x, bBox.top);

  // Shift by a few pixels to line up exactly.
  xy.y += 1;
  if (goog.userAgent.GECKO && Blockly.WidgetDiv.DIV.style.top) {
    // Firefox mis-reports the location of the border by a pixel
    // once the WidgetDiv is moved into position.
    xy.x -= 1;
    xy.y -= 1;
  }
  if (goog.userAgent.WEBKIT) {
    xy.y -= 3;
  }
  div.style.left = xy.x + 'px';
  div.style.top = xy.y + 'px';
};

/**
 * Close the editor, save the results, and dispose of the editable
 * text field's elements.
 * @return {!Function} Closure to call on destruction of the WidgetDiv.
 * @private
 */
Blockly.FieldTextArea.prototype.widgetDispose_ = function() {
  var thisField = this;
  return function() {
    var htmlInput = Blockly.FieldTextArea.htmlInput_;
    // Save the edit (if it validates).
    thisField.maybeSaveEdit_();

    thisField.unbindEvents_(htmlInput);
    Blockly.FieldTextArea.htmlInput_ = null;
    Blockly.Events.setGroup(false);

    // Delete style properties.
    var style = Blockly.WidgetDiv.DIV.style;
    style.width = 'auto';
    style.height = 'auto';
    style.fontSize = '';
  };
};

Blockly.FieldTextArea.prototype.maybeSaveEdit_ = function() {
  var htmlInput = Blockly.FieldTextArea.htmlInput_;
  // Save the edit (if it validates).
  var text = htmlInput.value;
  if (this.sourceBlock_) {
    var text1 = this.callValidator(text);
    if (text1 === null) {
      // Invalid edit.
      text = htmlInput.defaultValue;
    } else {
      // Validation function has changed the text.
      text = text1;
      if (this.onFinishEditing_) {
        this.onFinishEditing_(text);
      }
    }
  }
  this.setText(text);
  this.sourceBlock_.rendered && this.sourceBlock_.render();
};
