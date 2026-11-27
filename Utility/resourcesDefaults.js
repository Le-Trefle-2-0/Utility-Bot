// Contenu initial du message de ressources (salon « contacts-utiles »).
// Une section modifiée avec /ressourcesmodifier est enregistrée en base et remplace la version ci-dessous.

const lines = (...content) => content.join('\n');

module.exports = [
    {
        key: 'urgences',
        title: 'Numéros d\'urgence',
        emoji: '🚨',
        description: 'Numéros à contacter en cas de danger immédiat',
        content: lines(
            '- **112** : Numéro d\'urgence européen accessible depuis n\'importe quel téléphone, fixe ou mobile, sans code régional. Ce service transfère votre appel aux secours appropriés (pompiers, SAMU, police).',
            '- **15** : SAMU (service d\'assistance médicale d\'urgence) pour une urgence médicale grave.',
            '- **17** : Police/gendarmerie pour signaler une situation de danger (par exemple, violences, personne menaçant de se faire du mal).',
            '- **18** : Pompiers pour toute situation nécessitant une intervention rapide (accident, incendie, secours d\'urgence).',
            '- **114** : Numéro d\'urgence pour les personnes sourdes et malentendantes, un numéro unique, national, accessible en permanence par visiophonie, tchat, SMS ou fax.'
        )
    },
    // Affichée sur le message principal, sous les urgences (la liste complète reste dans « ecoute »)
    {
        key: 'frequentes',
        title: 'Besoin de parler ?',
        emoji: '🍀',
        description: 'Lignes d\'écoute affichées sur le message principal',
        content: lines(
            '- **3114** : numéro national de prévention au suicide tenu par des professionnels de santé. Tous les jours 24h/24. __*Confidentiel.*__',
            '- **SOS Amitié** : 09 72 39 40 50, tous les jours 24h/24, ou par [tchat](https://www.sosamitie.org/besoin-aide/chat) tous les jours de 13h à 3h du matin. __*Confidentiel et anonyme.*__',
            '- **Nightline** (étudiants) : 0 809 104 104 ou par [tchat](https://www.nightline.fr/ma-nightline) de 21h à 2h30. __*Anonyme et confidentiel.*__'
        )
    },
    {
        key: 'ecoute',
        title: 'Lignes d\'écoute globales et nationales',
        emoji: '📞',
        description: 'Mal-être, besoin de parler, prévention du suicide',
        content: lines(
            '- **3114** : numéro national de prévention au suicide tenu par des professionnels de santé. Tous les jours 24h/24. __*Confidentiel.*__',
            '- **3040** : numéro national d\'écoute pour les étudiants. De 10h à 21h en semaine et de 10h à 14h le samedi. __*Confidentiel.*__',
            '- **SOS Amitié** : pour toute difficulté, mal-être ou besoin de parler. Par téléphone au 09 72 39 40 50, tous les jours 24h/24, ou par [tchat](https://www.sosamitie.org/besoin-aide/chat) tous les jours de 13h à 3h du matin. __*Confidentiel et anonyme.*__',
            '- **Croix-Rouge Écoute** : pour toute difficulté, mal-être ou besoin de parler. 0800 858 858, de 10h à 18h du lundi au vendredi. __*Confidentiel et anonyme.*__',
            '- **Fil Santé Jeunes** : écoute, soutien et orientation des jeunes de 12 à 25 ans sur la santé, la sexualité, l\'amour, le mal-être, par des professionnels de santé et des professionnels du net. Au 08 00 23 52 36 tous les jours de 9h à 23h et par [tchat](https://www.filsantejeunes.com/tchat-individuel) tous les jours de 9h à 23h. __*Anonyme.*__',
            '- **Nightline** : pour les étudiants, pour toute difficulté, mal-être ou besoin de parler. Au 0 809 104 104 qui vous redirigera vers l\'antenne de votre région ou par [tchat](https://www.nightline.fr/ma-nightline) de 21h à 2h30. __*Anonyme et confidentiel.*__',
            '- **Le Refuge** : soutien, orientation des jeunes LGBT+ de 14 à 25 ans victimes d\'homophobie ou de transphobie et en situation de rupture avec leur famille. Au téléphone ou par SMS au 09 39 03 63 03 tous les jours de 8h à 00h.'
        )
    },
    {
        key: 'addictions',
        title: 'Lignes de sensibilisation aux addictions',
        emoji: '🍷',
        description: 'Alcool, drogues, cannabis, jeux d\'argent, tabac',
        content: lines(
            '- **Alcool Info Service** : pour toutes personnes consommant de l\'alcool et pour leurs proches. 0 980 980 930 tous les jours de 8h à 23h, ou par [tchat](https://www.alcool-info-service.fr/chat) de 12h à 19h.',
            '- **Drogues Info Service** : pour toutes personnes consommant de la drogue et pour leurs proches. 0 800 23 13 13, tous les jours de 8h à 23h et via le [tchat d\'Alcool Info Service](https://www.alcool-info-service.fr/chat) de 12h à 19h.',
            '- **Écoute Cannabis** : pour les consommateurs de cannabis et leurs proches. 0 980 980 940 tous les jours de 8h à 2h du matin.',
            '- **Joueurs Info Service** : pour toutes les personnes jouant aux jeux d\'argent et pour leurs proches. 09 74 75 13 13 tous les jours de 8h à 23h et via le [tchat d\'Alcool Info Service](https://www.alcool-info-service.fr/chat) de 12h à 19h.',
            '- **Tabac Info Service** : pour les consommateurs de tabac. 39 89 du lundi au samedi de 8h à 20h.'
        )
    },
    {
        key: 'violences',
        title: 'Violences et harcèlements',
        emoji: '🛡️',
        description: 'Harcèlement, violences, enfance en danger',
        content: lines(
            '- **3018** : Numéro national pour les jeunes victimes de harcèlement et de violences numériques, 6 jours sur 7 de 9h à 20h.',
            '- **France Victimes** : pour toute personne victime d\'infraction pénale (violence, viol, atteinte à la personne, etc.). 116 006, tous les jours de 9h à 20h.',
            '- **Allô Enfance Maltraitée** : pour les victimes ou témoins de violences sur enfant. 119, tous les jours 24h/24.',
            '- **Stop Maltraitance** : pour les victimes ou témoins de violences sur enfant. 0800 05 1234, du lundi au vendredi de 10h à 18h.',
            '- **Viols Femmes Informations** : 0800 05 95 95, du lundi au vendredi de 10h à 19h.',
            '- **Violences Femmes Info** : pour les femmes victimes de violence. Au 3919 tous les jours 24h/24 et par [tchat](https://solidaritefemmes.org/appeler-le-3919/) du lundi au vendredi, de 13h à 20h.',
            '- **Comment on s\'aime** : tchat de l\'association féministe « En Avant Toute(s) » sur toutes les questions de violences faites aux femmes et plus globalement sur tout ce qui touche aux relations, à l\'orientation sexuelle, à la sexualité ou à l\'amour. Par [tchat](https://commentonsaime.fr/besoin-daide/le-tchat-pour-discuter/). __*Anonyme et confidentiel.*__'
        )
    },
    {
        key: 'sexualite',
        title: 'Sensibilisation à la sexualité',
        emoji: '💬',
        description: 'Contraception, IVG, IST, relations',
        content: lines(
            '- **Sexualités, contraception, IVG** : ligne d\'écoute sur la sexualité, la contraception, l\'interruption volontaire de grossesse, les violences, par des écoutantes professionnelles formées. 0 800 08 11 11 du lundi au samedi de 9h à 20h et par [tchat](https://ivg-contraception-sexualites.org/). __*Anonyme.*__',
            '- **Sida Info Service** : ligne d\'écoute sur tout ce qui concerne les IST, par des professionnels. 0 800 840 800 tous les jours de 8h à 23h et par [tchat](https://www.sida-info-service.org/chattez-avec-sida-info-service/) du lundi au dimanche de 9h à 21h.',
            '- **Comment on s\'aime** : tchat de l\'association féministe « En Avant Toute(s) » sur toutes les questions de violences faites aux femmes et plus globalement sur tout ce qui touche aux relations, à l\'orientation sexuelle, à la sexualité ou à l\'amour. Par [tchat](https://commentonsaime.fr/besoin-daide/le-tchat-pour-discuter/). __*Anonyme et confidentiel.*__'
        )
    },
    {
        key: 'proximite',
        title: 'Ressources de proximité',
        emoji: '📍',
        description: 'Urgences, MDA, PAEJ, planning familial, CMP',
        content: lines(
            '- **Services d\'accueil des Urgences** pour les urgences physiques et psychiques. Accueil tous les jours 24h/24.',
            '- **Maison des jeunes et des adolescents** (MDA) : lieux institutionnels d\'écoute, de conseil, d\'accueil et d\'orientation pour les jeunes de 11 à 25 ans et leur entourage partout en France. Retrouvez toutes les MDA de France sur [Fil Santé Jeunes](https://www.filsantejeunes.com/mda). __*Confidentiel, anonyme et sans rendez-vous.*__',
            '- **Point d\'accueil et d\'écoute jeunes** (PAEJ) : organismes d\'écoute, de conseil, d\'accueil et d\'orientation pour les jeunes de 12 à 25 ans complétant les MDA. Retrouvez tous les PAEJ de France sur [Carto Santé Jeunes](https://www.cartosantejeunes.org/). __*Confidentiel, anonyme et sans rendez-vous.*__',
            '- **Planning familial** : lieux d\'écoute pour toutes les questions touchant à la santé sexuelle, la contraception et l\'IVG. [Site du Planning familial](https://www.planning-familial.org/fr). __*Confidentiel.*__',
            '- **Centre Médico-Psychologique** (CMP) : organismes institutionnels de soins psychiatriques et d\'accompagnement psychologique pour toute personne présentant un trouble psychique, un mal-être psychique ou des difficultés. Retrouvez tous les CMP de France sur l\'[annuaire santé du gouvernement](https://www.sante.fr/categories/centre-medico-psychologique-cmp). __*Confidentiel, sur rendez-vous.*__',
            '- **Professionnels de santé** : médecins (généraliste, psychiatre, gynécologue...) et psychologues à ta disposition en établissement scolaire pour les lycéens/collégiens et au SSU pour les étudiants à l\'université.'
        )
    },
    {
        key: 'autres',
        title: 'Autres ressources',
        emoji: '🧭',
        description: 'Annuaires pour trouver d\'autres contacts',
        content: lines(
            '- **Carto Santé Jeunes** : tous les organismes d\'accueil, d\'écoute et de conseil destinés aux jeunes (PAEJ, MDA, sexualité, Missions Locales, etc.). [Consulter la carte](https://www.cartosantejeunes.org/?CartoSante)',
            '- **Le Guide des lignes d\'écoute Psycom** : presque toutes les lignes d\'écoute recensées en France pour différents domaines et besoins. [Consulter le guide](https://www.psycom.org/sorienter/les-lignes-decoute/) (guide non à jour, renseignez-vous directement sur le site web de chaque organisme).'
        )
    }
];
