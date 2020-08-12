function routeController($scope, socket, sessionService) {
    $scope.route = 'jeu';

    this.$onInit = function () {
        // Ouverture des sockets pour les défis, utilisateurs connectés et top-ten.
        socket.emit('defi', JSON.parse(sessionService.getUser()).id)
        socket.emit('connected-users');
        socket.emit('top-ten');
    }

    $scope.updateRoute = function(route) {
        $scope.route = route;
    }

    $scope.$on('updateScoreParent', (ev, data) => {
    	$scope.$broadcast('updateScore', data);
    })

    $scope.$on('updateMedaillesParent', (ev, data) => {
        $scope.$broadcast('updateMedailles', data);
    })

    $scope.$on('acceptDefiParent', (ev, data) => {
        $scope.route = 'jeu';
        $scope.$broadcast('acceptDefi', data);
    })

}