function notificationController($scope, accessDataService, socket, sessionService, authService) {
    $scope.notifs = [];
    $scope.defis = [];

    socket.on('defi-response', data => {
        $scope.defis = data.defi;
        $.snackbar({ content: 'Nouveau défi reçu', timeout: 5000 });
    })

    $scope.acceptDefi = function (id, d) {
        // id correspond à la clé "_id" présente dans mongo
        $scope.$emit('acceptDefiParent', {id, d});
        removeDefi(id);
    }

    $scope.refuDefi = function (id, idx) {
        $scope.defis.splice(idx, 1);

        const data = {
            idUserDefiant: $scope.defis[idx].userDefiant,
            idUserDefiee: $scope.defis[idx].userDefiee,
            idUserGagnant: $scope.defis[idx].userDefiant,
            _id: id
        }

        accessDataService.postInfo('http://pedago02a.univ-avignon.fr:3204/defi/result', data)
            .then(d => {
                removeDefi(id);
                $.snackbar({ content: 'Défi supprimé', timeout: 5000 });
            })
    }

    const removeDefi = function (id) {
        const idx = $scope.defis.map(n => n._id).indexOf(id);
        $scope.defis.splice(idx, 1);
    }
}