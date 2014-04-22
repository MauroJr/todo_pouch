angular.module('testApp', [])

  .factory('myPouch', function() {
    var mydb = new PouchDB('ng-pouch');
    PouchDB.replicate('http://127.0.0.1:5984/ng-db', 'ng-pouch', {continuous: true});
    PouchDB.replicate('ng-pouch', 'http://127.0.0.1:5984/ng-db', {continuous: true});
    return mydb;
  })

.factory('pouchWrapper', function($q, $rootScope, myPouch) {
    return {
      add: function(text) {
        var deferred = $q.defer();
        var doc = {
          type: 'todo',
          text: text
        };
        myPouch.post(doc, function(err, res) {
          $rootScope.$apply(function() {
            if (err) {
              deferred.reject(err)
            } else {
              deferred.resolve(res)
            }
          });
        });
        return deferred.promise;
      },
      remove: function(id) {
        var deferred = $q.defer();
        myPouch.get(id, function(err, doc) {
          $rootScope.$apply(function() {
            if (err) {
              deferred.reject(err);
            } else {
              myPouch.remove(doc, function(err, res) {
                $rootScope.$apply(function() {
                  if (err) {
                    deferred.reject(err)
                  } else {
                    deferred.resolve(res)
                  }
                });
              });
            }
          });
        });
        return deferred.promise;
      }
    }
  })

.factory('listener', function($rootScope, myPouch) {
    myPouch.changes({
      continuous: true,
      onChange: function(change) {
        if (!change.deleted) {
          $rootScope.$apply(function() {
            myPouch.get(change.id, function(err, doc) {
              $rootScope.$apply(function() {
                if (err) console.log(err);
                $rootScope.$broadcast('newTodo', doc);
              })
            });
          })
        } else {
          $rootScope.$apply(function() {
            $rootScope.$broadcast('delTodo', change.id);
          });
        }
      }
    })
  })


.controller('TodoCtrl', function($scope, listener, pouchWrapper) {
    $scope.submit = function() {
      pouchWrapper.add($scope.text).then(function(res) {
        $scope.text = '';
        console.log(res)
      }, function(reason) {
        console.log(reason);
      })
    };

    $scope.remove = function(id) {
      pouchWrapper.remove(id).then(function(res) {
//      console.log(res);
      }, function(reason) {
        console.log(reason);
      })
    };

    $scope.todos = [];

    $scope.$on('newTodo', function(event, todo) {
      $scope.todos.push(todo);
    });

    $scope.$on('delTodo', function(event, id) {
      for (var i = 0; i<$scope.todos.length; i++) {
        if ($scope.todos[i]._id === id) {
          $scope.todos.splice(i,1);
        }
      }
    });
  })