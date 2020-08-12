function profileController($scope, authService, accessDataService) {	
	
	$scope.id = '';
	$scope.nom = '';
	$scope.prenom = '';
	$scope.identifiant = '';
	$scope.avatar = '';
	$scope.edit = false;
	$scope.file = '';
	$scope.hist = [];
	$scope.medailles = [];
	
	$scope.$on('loadUserData', () => {
		// Récupération des données aprés la connexion.
		$scope.load();
	});
	
	$scope.$on('updateScore', (ev, data) => {
		$scope.hist = data.historique;
		$scope.persistData();
	})

	$scope.$on('updateMedailles', (ev, data) => {
		$scope.medailles = data.medailles;
		$scope.persistData();
	})
	
	this.$onInit = function () {
		// Lors du refresh, récupérer les données si on est déjà connecté.
		if(authService.isLoggedIn())
			$scope.load();
	}


	$scope.load = function () {
		
		let t = JSON.parse(localStorage.getItem('session'));
			
		$scope.id = t.id;
		$scope.nom = t.nom;
		$scope.prenom = t.prenom;
		$scope.identifiant = t.identifiant;
		$scope.avatar = t.avatar;
		$scope.hist = t.historique;
		$scope.medailles = t.medailles;
		
	}



	// https://medium.com/@cuonggt/til-upload-file-in-angularjs-660b9cb4576f
	//mettre a jour l image en transmittant les d l image et l extension au serveur 
	$scope.$watch('file', function (ev) {
		if(!ev)
			return false;


		const data = {
			base64: ev.base64,
			ext: ev.filetype.split('/')[1] //extension de l image
		};

			 // envoyer les donnees au serveur sur la varialbe data
		accessDataService.postInfo('http://pedago02a.univ-avignon.fr:3204/profile/image', data)
			.then(res => {
				$scope.avatar = res.url;
				$scope.persistData();
				$.snackbar({content: 'Image modifiée', timeout: 5000});
			})
			.catch(err => {
				$.snackbar({content: 'Impossible de mettre à jour l\'image', timeout: 5000});
				console.error(err);
			})
	})



	$scope.updateProfile = function () {
		const data = {
			nom: $scope.nom,
			prenom: $scope.prenom,
			identifiant: $scope.identifiant
		};

		accessDataService.postInfo('http://pedago02a.univ-avignon.fr:3204/profile', data)
			.then(res => {
				$.snackbar({content: 'Profil mis-à-jour', timeout: 5000});
				$scope.persistData;
			})
			.catch(err => {
				$.snackbar({content: 'Impossible de mettre à jour le profil', timeout: 5000});
				console.error(err);
			})
	}
	//recuperer les infor de l ihistorique et les stocker dans localstorage
	$scope.persistData = function () {
		let t = JSON.stringify({
			id: $scope.id,
			identifiant: $scope.identifiant,
			nom: $scope.nom,
			prenom: $scope.prenom,
			avatar: $scope.avatar,
			historique: $scope.hist,
			medailles: $scope.medailles
		});

		localStorage.setItem('session', t);

	}

}
