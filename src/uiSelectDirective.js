uis.directive('uiSelect',
  ['$document', 'uiSelectConfig', 'uiSelectMinErr', 'uisOffset', '$compile', '$parse', '$timeout',
  function($document, uiSelectConfig, uiSelectMinErr, uisOffset, $compile, $parse, $timeout) {

  return {
    restrict: 'EA',
    templateUrl: function(tElement, tAttrs) {
      var theme = tAttrs.theme || uiSelectConfig.theme;
      return theme + (angular.isDefined(tAttrs.multiple) ? '/select-multiple.tpl.html' : '/select.tpl.html');
    },
    replace: true,
    transclude: true,
    require: ['uiSelect', '^ngModel'],
    scope: true,

    controller: 'uiSelectCtrl',
    controllerAs: '$select',
    compile: function(tElement, tAttrs) {

      //Multiple or Single depending if multiple attribute presence
      if (angular.isDefined(tAttrs.multiple))
        tElement.append("<ui-select-multiple/>").removeAttr('multiple');
      else
        tElement.append("<ui-select-single/>");

      return function(scope, element, attrs, ctrls, transcludeFn) {

        var $select = ctrls[0];
        var ngModel = ctrls[1];

        $select.generatedId = uiSelectConfig.generateId();
        $select.baseTitle = attrs.title || 'Select box';
        $select.focusserTitle = $select.baseTitle + ' focus';
        $select.focusserId = 'focusser-' + $select.generatedId;

        $select.closeOnSelect = function() {
          if (angular.isDefined(attrs.closeOnSelect)) {
            return $parse(attrs.closeOnSelect)();
          } else {
            return uiSelectConfig.closeOnSelect;
          }
        }();

        $select.onSelectCallback = $parse(attrs.onSelect);
        $select.onRemoveCallback = $parse(attrs.onRemove);

        //Set reference to ngModel from uiSelectCtrl
        $select.ngModel = ngModel;

        $select.choiceGrouped = function(group){
          return $select.isGrouped && group && group.name;
        };

        if(attrs.tabindex){
          attrs.$observe('tabindex', function(value) {
            $select.focusInput.attr("tabindex", value);
            element.removeAttr("tabindex");
          });
        }

        scope.$watch('searchEnabled', function() {
            var searchEnabled = scope.$eval(attrs.searchEnabled);
            $select.searchEnabled = searchEnabled !== undefined ? searchEnabled : uiSelectConfig.searchEnabled;
        });

        scope.$watch('sortable', function() {
            var sortable = scope.$eval(attrs.sortable);
            $select.sortable = sortable !== undefined ? sortable : uiSelectConfig.sortable;
        });

        attrs.$observe('disabled', function() {
          // No need to use $eval() (thanks to ng-disabled) since we already get a boolean instead of a string
          $select.disabled = attrs.disabled !== undefined ? attrs.disabled : false;
        });

        attrs.$observe('resetSearchInput', function() {
          // $eval() is needed otherwise we get a string instead of a boolean
          var resetSearchInput = scope.$eval(attrs.resetSearchInput);
          $select.resetSearchInput = resetSearchInput !== undefined ? resetSearchInput : true;
        });

        attrs.$observe('tagging', function() {
          if(attrs.tagging !== undefined)
          {
            // $eval() is needed otherwise we get a string instead of a boolean
            var taggingEval = scope.$eval(attrs.tagging);
            $select.tagging = {isActivated: true, fct: taggingEval !== true ? taggingEval : undefined};
          }
          else
          {
            $select.tagging = {isActivated: false, fct: undefined};
          }
        });

        attrs.$observe('taggingLabel', function() {
          if(attrs.tagging !== undefined )
          {
            // check eval for FALSE, in this case, we disable the labels
            // associated with tagging
            if ( attrs.taggingLabel === 'false' ) {
              $select.taggingLabel = false;
            }
            else
            {
              $select.taggingLabel = attrs.taggingLabel !== undefined ? attrs.taggingLabel : '(new)';
            }
          }
        });

        attrs.$observe('taggingTokens', function() {
          if (attrs.tagging !== undefined) {
            var tokens = attrs.taggingTokens !== undefined ? attrs.taggingTokens.split('|') : [',','ENTER'];
            $select.taggingTokens = {isActivated: true, tokens: tokens };
          }
        });

        //Automatically gets focus when loaded
        if (angular.isDefined(attrs.autofocus)){
          $timeout(function(){
            $select.setFocus();
          });
        }

        //Gets focus based on scope event name (e.g. focus-on='SomeEventName')
        if (angular.isDefined(attrs.focusOn)){
          scope.$on(attrs.focusOn, function() {
              $timeout(function(){
                $select.setFocus();
              });
          });
        }

        function onDocumentClick(e) {
          if (!$select.open) return; //Skip it if dropdown is close

          var contains = false;

          if (window.jQuery) {
            // Firefox 3.6 does not support element.contains()
            // See Node.contains https://developer.mozilla.org/en-US/docs/Web/API/Node.contains
            contains = window.jQuery.contains(element[0], e.target);
          } else {
            contains = element[0].contains(e.target);
          }

          if (!contains && !$select.clickTriggeredSelect) {
            //Will lose focus only with certain targets
            var focusableControls = ['input','button','textarea'];
            var targetScope = angular.element(e.target).scope(); //To check if target is other ui-select
            var skipFocusser = targetScope && targetScope.$select && targetScope.$select !== $select; //To check if target is other ui-select
            if (!skipFocusser) skipFocusser =  ~focusableControls.indexOf(e.target.tagName.toLowerCase()); //Check if target is input, button or textarea
            $select.close(skipFocusser);
            scope.$digest();
          }
          $select.clickTriggeredSelect = false;
        }

        // See Click everywhere but here event http://stackoverflow.com/questions/12931369
        $document.on('click', onDocumentClick);

        scope.$on('$destroy', function() {
          $document.off('click', onDocumentClick);
        });

        // Move transcluded elements to their correct position in main template
        transcludeFn(scope, function(clone) {
          // See Transclude in AngularJS http://blog.omkarpatil.com/2012/11/transclude-in-angularjs.html

          // One day jqLite will be replaced by jQuery and we will be able to write:
          // var transcludedElement = clone.filter('.my-class')
          // instead of creating a hackish DOM element:
          var transcluded = angular.element('<div>').append(clone);

          var transcludedMatch = transcluded.querySelectorAll('.ui-select-match');
          transcludedMatch.removeAttr('ui-select-match'); //To avoid loop in case directive as attr
          transcludedMatch.removeAttr('data-ui-select-match'); // Properly handle HTML5 data-attributes
          if (transcludedMatch.length !== 1) {
            throw uiSelectMinErr('transcluded', "Expected 1 .ui-select-match but got '{0}'.", transcludedMatch.length);
          }
          element.querySelectorAll('.ui-select-match').replaceWith(transcludedMatch);

          var transcludedChoices = transcluded.querySelectorAll('.ui-select-choices');
          transcludedChoices.removeAttr('ui-select-choices'); //To avoid loop in case directive as attr
          transcludedChoices.removeAttr('data-ui-select-choices'); // Properly handle HTML5 data-attributes
          if (transcludedChoices.length !== 1) {
            throw uiSelectMinErr('transcluded', "Expected 1 .ui-select-choices but got '{0}'.", transcludedChoices.length);
          }
          element.querySelectorAll('.ui-select-choices').replaceWith(transcludedChoices);
        });

        // Support for appending the select field to the body when its open
        var appendToBody = scope.$eval(attrs.appendToBody);
        if (appendToBody !== undefined ? appendToBody : uiSelectConfig.appendToBody) {
          scope.$watch('$select.open', function(isOpen) {
            if (isOpen) {
              positionDropdown();
            } else {
              resetDropdown();
            }
          });

          // Move the dropdown back to its original location when the scope is destroyed. Otherwise
          // it might stick around when the user routes away or the select field is otherwise removed
          scope.$on('$destroy', function() {
            resetDropdown();
          });
        }

        // Hold on to a reference to the .ui-select-container element for appendToBody support
        var placeholder = null,
            originalWidth = '';

        function positionDropdown() {
          // Remember the absolute position of the element
          var offset = uisOffset(element);

          // Clone the element into a placeholder element to take its original place in the DOM
          placeholder = angular.element('<div class="ui-select-placeholder"></div>');
          placeholder[0].style.width = offset.width + 'px';
          placeholder[0].style.height = offset.height + 'px';
          element.after(placeholder);

          // Remember the original value of the element width inline style, so it can be restored
          // when the dropdown is closed
          originalWidth = element[0].style.width;

          // Now move the actual dropdown element to the end of the body
          $document.find('body').append(element);

          element[0].style.position = 'absolute';
          element[0].style.left = offset.left + 'px';
          element[0].style.top = offset.top + 'px';
          element[0].style.width = offset.width + 'px';
        }

        function resetDropdown() {
          if (placeholder === null) {
            // The dropdown has not actually been display yet, so there's nothing to reset
            return;
          }

          // Move the dropdown element back to its original location in the DOM
          placeholder.replaceWith(element);
          placeholder = null;

          element[0].style.position = '';
          element[0].style.left = '';
          element[0].style.top = '';
          element[0].style.width = originalWidth;
        }

        // Hold on to a reference to the .ui-select-dropdown element for direction support.
        var dropdown = null,
            directionUpClassName = 'direction-up';

        // Support changing the direction of the dropdown if there isn't enough space to render it.
        scope.$watch('$select.open', function(isOpen) {
          if (isOpen) {
            dropdown = angular.element(element).querySelectorAll('.ui-select-dropdown');
            if (dropdown === null) {
              return;
            }

            // Hide the dropdown so there is no flicker until $timeout is done executing.
            dropdown[0].style.visibility = 'hidden';

            // Delay positioning the dropdown until all choices have been added so its height is correct.
            $timeout(function(){
              var offset = uisOffset(element);
              var offsetDropdown = uisOffset(dropdown);

              // Determine if the direction of the dropdown needs to be changed.
              if (offset.top + offset.height + offsetDropdown.height > $document[0].documentElement.scrollTop + $document[0].documentElement.clientHeight) {
                dropdown[0].style.position = 'absolute';
                dropdown[0].style.top = (offsetDropdown.height * -1) + 'px';
                element.addClass(directionUpClassName);
              }

              // Display the dropdown once it has been positioned.
              dropdown[0].style.visibility = '';
            });
          } else {
              if (dropdown === null) {
                return;
              }

              // Reset the position of the dropdown.
              dropdown[0].style.position = '';
              dropdown[0].style.top = '';
              element.removeClass(directionUpClassName);
          }
        });

        $select.searchInput.on('keyup', function(e) {

          if ( ! KEY.isVerticalMovement(e.which) ) {
            scope.$evalAsync( function () {
              $select.activeIndex = $select.taggingLabel === false ? -1 : 0;
            });
          }
          // Push a "create new" item into array if there is a search string
          if ( $select.tagging.isActivated && $select.search.length > 0 ) {

            // return early with these keys
            if (e.which === KEY.TAB || KEY.isControl(e) || KEY.isFunctionKey(e) || e.which === KEY.ESC || KEY.isVerticalMovement(e.which) ) {
              return;
            }
            // always reset the activeIndex to the first item when tagging
            $select.activeIndex = $select.taggingLabel === false ? -1 : 0;
            // taggingLabel === false bypasses all of this
            if ($select.taggingLabel === false) return;

            var items = angular.copy( $select.items );
            var stashArr = angular.copy( $select.items );
            var newItem;
            var item;
            var hasTag = false;
            var dupeIndex = -1;
            var tagItems;
            var tagItem;

            // case for object tagging via transform `$select.tagging.fct` function
            if ( $select.tagging.fct !== undefined) {
              tagItems = $select.$filter('filter')(items,{'isTag': true});
              if ( tagItems.length > 0 ) {
                tagItem = tagItems[0];
              }
              // remove the first element, if it has the `isTag` prop we generate a new one with each keyup, shaving the previous
              if ( items.length > 0 && tagItem ) {
                hasTag = true;
                items = items.slice(1,items.length);
                stashArr = stashArr.slice(1,stashArr.length);
              }
              newItem = $select.tagging.fct($select.search);
              newItem.isTag = true;
              // verify the the tag doesn't match the value of an existing item
              if ( stashArr.filter( function (origItem) { return angular.equals( origItem, $select.tagging.fct($select.search) ); } ).length > 0 ) {
                return;
              }
              newItem.isTag = true;
              // handle newItem string and stripping dupes in tagging string context
            } else {
              // find any tagging items already in the $select.items array and store them
              tagItems = $select.$filter('filter')(items,function (item) {
                return item.match($select.taggingLabel);
              });
              if ( tagItems.length > 0 ) {
                tagItem = tagItems[0];
              }
              item = items[0];
              // remove existing tag item if found (should only ever be one tag item)
              if ( item !== undefined && items.length > 0 && tagItem ) {
                hasTag = true;
                items = items.slice(1,items.length);
                stashArr = stashArr.slice(1,stashArr.length);
              }
              newItem = $select.search+' '+$select.taggingLabel;
              if ( _findApproxDupe($select.selected, $select.search) > -1 ) {
                return;
              }
              // verify the the tag doesn't match the value of an existing item from
              // the searched data set or the items already selected
              if ( _findCaseInsensitiveDupe(stashArr.concat($select.selected)) ) {
                // if there is a tag from prev iteration, strip it / queue the change
                // and return early
                if ( hasTag ) {
                  items = stashArr;
                  scope.$evalAsync( function () {
                    $select.activeIndex = 0;
                    $select.items = items;
                  });
                }
                return;
              }
              if ( _findCaseInsensitiveDupe(stashArr) ) {
                // if there is a tag from prev iteration, strip it
                if ( hasTag ) {
                  $select.items = stashArr.slice(1,stashArr.length);
                }
                return;
              }
            }
            if ( hasTag ) dupeIndex = _findApproxDupe($select.selected, newItem);
            // dupe found, shave the first item
            if ( dupeIndex > -1 ) {
              items = items.slice(dupeIndex+1,items.length-1);
            } else {
              items = [];
              items.push(newItem);
              items = items.concat(stashArr);
            }
            scope.$evalAsync( function () {
              $select.activeIndex = 0;
              $select.items = items;
            });
          }
        });
        function _findCaseInsensitiveDupe(arr) {
          if ( arr === undefined || $select.search === undefined ) {
            return false;
          }
          var hasDupe = arr.filter( function (origItem) {
            if ( $select.search.toUpperCase() === undefined || origItem === undefined ) {
              return false;
            }
            return origItem.toUpperCase() === $select.search.toUpperCase();
          }).length > 0;

          return hasDupe;
        }
        function _findApproxDupe(haystack, needle) {
          var dupeIndex = -1;
          if(angular.isArray(haystack)) {
            var tempArr = angular.copy(haystack);
            for (var i = 0; i <tempArr.length; i++) {
              // handle the simple string version of tagging
              if ( $select.tagging.fct === undefined ) {
                // search the array for the match
                if ( tempArr[i]+' '+$select.taggingLabel === needle ) {
                  dupeIndex = i;
                }
                // handle the object tagging implementation
              } else {
                var mockObj = tempArr[i];
                mockObj.isTag = true;
                if ( angular.equals(mockObj, needle) ) {
                  dupeIndex = i;
                }
              }
            }
          }
          return dupeIndex;
        }
      };
    }
  };
}]);
