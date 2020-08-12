function authController($rootScope,$scope, authService) {

	$scope.username = '';
	$scope.password = '';
	$scope.msg = '';
	$scope.logginStatus = null;
	$scope.lastLoggin = localStorage.getItem('derniere-connexion') || null;


	$scope.login = function() {

		authService.login($scope.username, $scope.password)
			.then(data => {
				$scope.logginStatus = data;

				if(data) {
					// Connexion réussi
					// Mise-à-jour de la date de dernière connexion
					// Affichage du bandeau

					localStorage.setItem('derniere-connexion', new Date().toLocaleString());
					$scope.lastLoggin = new Date().toLocaleString();
					$scope.msg = 'Connexion réussi';
					
					// Chargement des données dans le controleur `profileController`.
					$scope.$broadcast('loadUserData');
				}

				else $scope.msg = 'Login ou mot de passe incorrect';
			})
	}

	$scope.logout = function() {
		authService.logout()
			.then(() => {
				$scope.reinit();
			})
	}

	$scope.isLoggedIn = function() {
		return authService.isLoggedIn();
	}
	
	$scope.reinit = function () {
		$scope.username = '';
		$scope.password = '';
		$scope.msg = '';
		$scope.logginStatus = null;
	}
}
