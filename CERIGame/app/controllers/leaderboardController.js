function leaderboardController($scope, socket) {
    $scope.cUsers = null;
    $scope.topTen = null;

    $scope.loading = false;
        
    socket.on('connected-users-response', data => {
        $scope.cUsers = data.users;
        $scope.$apply();
    })
    
    socket.on('top-ten-response', data => {
        $scope.topTen = data.users;
        $scope.$apply();
    })
}