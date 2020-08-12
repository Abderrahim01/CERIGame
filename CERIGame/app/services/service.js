function accessDataService($http) {
	this.getInfo = function(url) {
		return $http.get(url)
					.then(response => response.data)
					.catch(() => "Something went wrong");
	}

	this.postInfo = function (url, data) {
		return $http.post(url, data)
				.then(response => response.data)
				.catch(error => error)
	}
}

function sessionService($log) {
	this._user = localStorage.getItem('session');

	this.getUser = function () {
		return this._user;
	}

	this.setUser = function (user) {
		this._user = user;
		localStorage.setItem('session', user);
		return this;
	}
	
	this.destroy = function () {
		this.setUser(null);
	}
}

function authService ($http, sessionService) {
	this.isLoggedIn = function () {
		return sessionService.getUser() !== null && sessionService.getUser() !== 'null';
	}
	
	this.login = function (login, password) {
		return $http.get('http://pedago02a.univ-avignon.fr:3204/login',{params: { 'login': login, 'password': password }})
						.then(d => {
							const { defis } = d.data;
							
							if(defis) {
								localStorage.setItem('defis', JSON.stringify(defis));
								delete d.data.defis;
							}

							sessionService.setUser(JSON.stringify(d.data));
							return true;
						})
						.catch(e => false)
	}

	this.logout = function () {
		return $http.get('http://pedago02a.univ-avignon.fr:3204/logout')
					.then(() => {
						sessionService.destroy()
						localStorage.removeItem('defis');
						localStorage.removeItem('users');
						localStorage.removeItem('connected-users');
						localStorage.removeItem('top-ten');
					}).catch(e => {
						console.error('Erreur lors de la déconnexion côté serveur');
					})
	}


}


function treatSocket ($rootScope) {
	var socket = io.connect('http://pedago02a.univ-avignon.fr:3204')

	return {
		on: function (eventName, callback) {
			socket.on(eventName, callback);
		},

		emit: function (eventName, data) {
			socket.emit(eventName, data);
		}
	}

}