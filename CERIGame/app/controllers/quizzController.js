function quizzController($scope, $interval, accessDataService, sessionService) {
    $scope.theme = '';
    $scope.niveau = '';
    $scope.quizz = [];
    $scope.quizzIdx = 0;
    $scope.quizzType = 'default';
    $scope.enJeu = false;
    $scope.partieFini = false;
    $scope.nbBonneReponse = 0;
    $scope.score = 0;

    $scope.users = [];
    $scope.defi = false;
    $scope.defiEnvoye = false;
    $scope.userDefiee = 0;
    $scope.userDefiantScore = 0;
    $scope.userDefieeId = null;
    $scope.userDefiantId = null;
    $scope.defiId = null;

    $scope.chronoSec = 0;
    $scope.chronoMin = 0;



    let timerRef = null;
    const _ = window._;


    $scope.$watch('userDefiee', () => {
        console.log($scope.userDefiee);
    })

    $scope.$on('acceptDefi', (ev, data) => {
        $scope.restart();

        const defi = data.d;

        const {
            quizz,
            userDefiee,
            userDefiant,
            userDefiantScore,
        } = defi;

        $scope.quizz = quizz;
        $scope.quizzType = 'defi';
        $scope.userDefiantScore = userDefiantScore;
        $scope.userDefieeId = userDefiee;
        $scope.userDefiantId = userDefiant;
        $scope.defiId = data.id;
        $scope.enJeu = true;
        $scope.timer();

    });


    $scope.getQuizz = function () {
        accessDataService.getInfo('http://pedago02a.univ-avignon.fr:3204/quizz?theme=' + $scope.theme)
            .then(data => {

                const propositions = [];
                const quizz = [];
                const rnds = [];

                // On génére des nombres aléatoires
                // qui nous permettront de garder uniquement 5 quizz aléatoire
                for (let index = 0; index < 5; index++) {
                    let rnd = Math.floor(Math.random() * 30);

                    while (rnds.includes(rnd)) {
                        rnd = Math.floor(Math.random() * 30);
                    }

                    rnds.push(rnd);
                }

                // On récupère les quizzs et propositions des quizzs aux index
                // générés précédemment.
                for (let index = 0; index < rnds.length; index++) {
                    quizz.push(data.quizz[rnds[index]]);
                    propositions.push(quizz[index].propositions);
                }

                switch ($scope.niveau) {
                    case 'Facile':
                        // On parcours les 5 quizzs, puis on supprime deux propositions
                        // il ne doit rester qu'une proposition et la bonne réponse
                        for (let index = 0; index < quizz.length; index++) {
                            const resp = quizz[index]['réponse'];
                            const respIdx = quizz[index].propositions.indexOf(resp);

                            let rndIdx = Math.floor(Math.random() * 3);

                            while (rndIdx === respIdx) {
                                rndIdx = Math.floor(Math.random() * 3);
                            }

                            let props = new Array();

                            props.push(quizz[index].propositions[respIdx]);
                            props.push(quizz[index].propositions[rndIdx]);

                            quizz[index].propositions = _.shuffle(props);

                        }
                        break;

                    case 'Intermédiaire':
                        // On parcours les 5 quizz, puis on supprime une proposition
                        // Il doit rester la bonne réponse + deux propositions
                        for (let index = 0; index < quizz.length; index++) {
                            const resp = quizz[index]['réponse'];
                            const respIdx = quizz[index].propositions.indexOf(resp);

                            let rndIdx = Math.floor(Math.random() * 3);

                            while (rndIdx === respIdx) {
                                rndIdx = Math.floor(Math.random() * 3);
                            }

                            let rndIdx2 = Math.floor(Math.random() * 3);

                            while (rndIdx2 === respIdx || rndIdx2 === rndIdx) {
                                rndIdx2 = Math.floor(Math.random() * 3);
                            }

                            let props = new Array();

                            props.push(quizz[index].propositions[respIdx])
                            props.push(quizz[index].propositions[rndIdx])
                            props.push(quizz[index].propositions[rndIdx2])

                            quizz[index].propositions = _.shuffle(props);

                        }
                        break;
                    default:
                        break;
                }


                $scope.quizz = quizz;
                $scope.enJeu = true;
                $scope.timer();


            })
            .catch(() => console.error)
    }


    $scope.timer = function () {
        timerRef = $interval(function () {
            if ($scope.chronoSec === 59) {
                $scope.chronoSec = 0;
                $scope.chronoMin += 1;
            }

            else $scope.chronoSec += 1;

        }, 1000)
    }

    $scope.incIdx = function (r, $event) {

        if (r === $scope.quizz[$scope.quizzIdx]['réponse']) {
            $event.target.classList.add('card-success');
            $scope.nbBonneReponse += 1;
        }

        else $event.target.classList.add('card-error');

        setTimeout(() => {
            if ($scope.quizzIdx >= $scope.quizz.length - 1) {
                const temps = $scope.chronoMin * 60 + $scope.chronoSec;
                const score = Math.floor($scope.nbBonneReponse * 1398 / temps);

                $scope.score = score;
                $scope.partieFini = true;
                $interval.cancel(timerRef);

                $scope.$apply();

                if ($scope.quizzType === 'defi') {
                    const data = {
                        idUserDefiant: $scope.userDefiantId,
                        idUserDefiee: $scope.userDefieeId,
                        _id: $scope.defiId
                    }

                    // Comparer les scores
                    if (score > $scope.userDefiantScore) {
                        // Meilleur score -> Défi remporté
                        // Ajouter medaille et ajouter score dans historique
                        data['idUserGagnant'] = $scope.userDefieeId;
                        updateScore();
                    }

                    else {
                        // Score inférieur
                        // Ajouter médaille au lanceur du défi
                        data['idUserGagnant'] = $scope.userDefiantId;
                    }

                    updateMedailles(data);

                }

                else updateScore();
            }

            $scope.quizzIdx += 1;
        }, 1000);

    }

    $scope.restart = function () {
        $scope.partieFini = false;
        $scope.enJeu = false;
        $scope.quizzIdx = 0;
        $scope.chronoMin = 0;
        $scope.chronoSec = 0;
        $scope.defiEnvoye = false;
    }

    $scope.initDefi = async function () {

        $scope.defi = true;

        const users = await getUsers();

        $scope.users = users;

        $scope.$apply();

    }

    $scope.sendDefi = function () {
        $scope.defi = false;

        const user = JSON.parse(sessionService.getUser());

        const data = {
            userDefiee: parseInt($scope.userDefiee, 10),
            userDefiant: user.id,
            userDefiantNom: user.nom,
            userDefiantPrenom: user.prenom,
            userDefiantScore: $scope.score,
            quizz: $scope.quizz
        }

        accessDataService.postInfo('http://pedago02a.univ-avignon.fr:3204/defi', data)
            .then(() => {
                $scope.defiEnvoye = true;
                $.snackbar({ content: 'Demande de défi envoyée', timeout: 5000 });
            })
            .catch(() => {
                $.snackbar({ content: 'La demande de défi n\'a pu être envoyée', timeout: 5000 });
            })

    }

    const getUsers = function () {

        return new Promise((resolve, reject) => {

            const users = JSON.parse(localStorage.getItem('users'));

            if (!users) {
                accessDataService.getInfo('http://pedago02a.univ-avignon.fr:3204/users')
                    .then(d => {
                        localStorage.setItem('users', JSON.stringify(d.users));
                        return resolve(d.users);
                    })
            }

            else return resolve(users);

        })
    }

    const updateScore = function () {
        const data = {
            score: $scope.score,
            nbReponse: $scope.nbBonneReponse,
            temps: $scope.chronoMin * 60 + $scope.chronoSec
        };

        accessDataService.postInfo('http://pedago02a.univ-avignon.fr:3204/quizz', data)
            .then(d => {
                console.log('Score enregistré');
                $scope.$emit('updateScoreParent', d);
            })
            .catch(() => console.error('Impossible d\'enregistrer le score'))
    }

    const updateMedailles = function (data) {
        accessDataService.postInfo('http://pedago02a.univ-avignon.fr:3204/defi/result', data)
            .then(d => {
                console.log('Medailles enregistré');
                $scope.$emit('updateMedaillesParent', d);
            })
            .catch(() => console.error('Impossible de mettre-à-jour les médailles'))
    }
}