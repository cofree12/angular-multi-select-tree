/*jshint indent: 2 */
/*global angular: false */

(function () {

  'use strict';
  var mainModule = angular.module('multi-select-tree');

  /**
   * Controller for multi select tree.
   */
  mainModule.controller('multiSelectTreeCtrl', ['$scope', '$document', function ($scope, $document) {

    var activeItem;

    $scope.showTree = false;
    $scope.selectedItems = [];
    $scope.multiSelect = $scope.multiSelect || false;

    /**
     * Clicking on document will hide the tree.
     */
    function docClickHide() {
      closePopup();
      $scope.$apply();
    }

    /**
     * Closes the tree popup.
     */
    function closePopup() {
      $scope.showTree = false;
      if (activeItem) {
        activeItem.isActive = false;
        activeItem = undefined;
      }
      $document.off('click', docClickHide);
    }

    /**
     * Sets the active item.
     *
     * @param item the item element.
     */
    $scope.onActiveItem = function (item) {
      if (activeItem !== item) {
        if (activeItem) {
          activeItem.isActive = false;
        }
        activeItem = item;
        activeItem.isActive = true;
      }
    };

    /**
     * Copies the selectedItems in to output model.
     */
    $scope.refreshOutputModel = function () {
      $scope.outputModel = angular.copy($scope.selectedItems);
    };

    /**
     * Refreshes the selected Items model.
     */
    $scope.refreshSelectedItems = function () {
      $scope.selectedItems = [];
      if ($scope.inputModel) {
        setSelectedChildren($scope.inputModel);
      }
    };

    /**
     * Iterates over children and sets the selected items.
     *
     * @param children the children element.
     */
    function setSelectedChildren(children) {
      for (var i = 0, len = children.length; i < len; i++) {
        if (!isItemSelected(children[i]) && children[i].selected === true) {
          $scope.selectedItems.push(children[i]);
        } else if (isItemSelected(children[i]) && children[i].selected === false) {
          children[i].selected = true;
        }
        if (children[i] && children[i].children) {
          setSelectedChildren(children[i].children);
        }
      }
    }
    /**
     * Checks of the item is already selected.
     *
     * @param item the item to be checked.
     * @return {boolean} if the item is already selected.
     */
    function isItemSelected(item) {
      var isSelected = false;
      if ($scope.selectedItems) {
        for (var i = 0; i < $scope.selectedItems.length; i++) {
          if ($scope.selectedItems[i].id === item.id) {
            isSelected = true;
            break;
          }
        }
      }
      return isSelected;
    }

    /**
     * Deselect the item.
     *
     * @param item the item element
     * @param $event
     */
    $scope.deselectItem = function (item, $event) {
      $event.stopPropagation();
      $scope.selectedItems.splice($scope.selectedItems.indexOf(item), 1);
      item.selected = false;
      this.refreshOutputModel();
    };

    /**
     * Swap the tree popup on control click event.
     *
     * @param $event the click event.
     */
    $scope.onControlClicked = function ($event) {
      $event.stopPropagation();
      $scope.showTree = !$scope.showTree;
      if ($scope.showTree) {
        $document.on('click', docClickHide);
      }
    };

    /**
     * Stop the event on filter clicked.
     *
     * @param $event the click event
     */
    $scope.onFilterClicked = function ($event) {
      $event.stopPropagation();
    };

    /**
     * Clears the filter text.
     *
     * @param $event the click event
     */
    $scope.clearFilter = function ($event) {
      $event.stopPropagation();
      $scope.filterKeyword = '';
    };

    /**
     * Wrapper function for can select item callback.
     *
     * @param item the item
     */
    $scope.canSelectItem = function (item) {
      return $scope.callback({ item: item, selectedItems: $scope.selectedItems });
    };

    /**
     * The callback is used to switch the views.
     * based on the view type.
     *
     * @param $event the event object.
     */
    $scope.switchCurrentView = function ($event) {
      $event.stopPropagation();
      $scope.switchViewCallback({ scopeObj: $scope });
    };

    /**
     * Handles the item select event.
     *
     * @param item the selected item.
     */
    $scope.itemSelected = function (item) {
      if (($scope.useCallback && $scope.canSelectItem(item) === false) ||
        ($scope.selectOnlyLeafs && item.children && item.children.length > 0)) {
        return;
      }

      if (!$scope.multiSelect) {
        closePopup();
        for (var i = 0; i < $scope.selectedItems.length; i++) {
          $scope.selectedItems[i].selected = false;
        }
        item.selected = true;
        $scope.selectedItems = [];
        $scope.selectedItems.push(item);
      } else {
        item.selected = true;
        var indexOfItem = $scope.selectedItems.indexOf(item);
        if (isItemSelected(item)) {
          item.selected = false;
          $scope.selectedItems.splice(indexOfItem, 1);
        } else {
          $scope.selectedItems.push(item);
        }
      }
      this.refreshOutputModel();
    };

  }]);

  /**
   * sortableItem directive.
   */
  mainModule.directive('multiSelectTree',
    ['_', function (_) {
      return {
        restrict: 'E',
        templateUrl: 'src/multi-select-tree.tpl.html',
        scope: {
          inputModel: '=',
          outputModel: '=?',
          multiSelect: '=?',
          switchView: '=?',
          switchViewLabel: '@',
          switchViewCallback: '&',
          selectOnlyLeafs: '=?',
          callback: '&',
          defaultLabel: '@'
        },
        link: function (scope, element, attrs) {
          if (attrs.callback) {
            scope.useCallback = true;
          }

          // watch for changes in input model as a whole
          // this on updates the multi-select when a user load a whole new input-model.
          scope.$watch('inputModel', function (newVal) {
            if (newVal) {
              scope.refreshSelectedItems();
              scope.refreshOutputModel();
            }
          });

          /**
           * Checks whether any of children match the keyword.
           *
           * @param item the parent item
           * @param keyword the filter keyword
           * @returns {boolean} false if matches.
           */
          function isChildrenFiltered(item, keyword) {
            var childNodes = getAllChildNodesFromNode(item, []);
            for (var i = 0, len = childNodes.length; i < len; i++) {
              if (childNodes[i].name.toLowerCase().indexOf(keyword.toLowerCase()) !== -1) {
                return false;
              }
            }
            return true;
          }

          /**
           * Return all childNodes of a given node (as Array of Nodes)
           */
          function getAllChildNodesFromNode(node, childNodes) {
            for (var i = 0; i < node.children.length; i++) {
              var current = node.children[i];
              if (!current.children || !current.children.length) {
                childNodes.push(current);
              }
              // add the childNodes from the children if available
              getAllChildNodesFromNode(node.children[i], childNodes);
            }
            return childNodes;
          }

          function filterNode(node, filterKeyword) {

            if (!node.children.length) {
              if (node.name.toLowerCase().indexOf(filterKeyword.toLowerCase()) !== -1) {
                node.isFiltered = false;
              }
              else {
                node.isFiltered = true;
              }
              return node.isFiltered;
            }

            var isFiltered = true;
            for (var i = 0; i < node.children.length; i++) {
              isFiltered &= filterNode(node.children[i], filterKeyword);
            }
            node.isFiltered = isFiltered;
            node.isExpanded = !isFiltered && filterKeyword !== '';
            return isFiltered;
          }

          scope.$watch('filterKeyword', _.throttle(function () {
            if (scope.filterKeyword !== undefined) {
              angular.forEach(scope.inputModel, function (item) {
                var isFiltered = filterNode(item, scope.filterKeyword);
                item.isFiltered = isFiltered;
                item.isExpanded = !isFiltered && scope.filterKeyword !== '';
              });
            }
          }, 200));
        },
        controller: 'multiSelectTreeCtrl'
      };
    }]);
}());