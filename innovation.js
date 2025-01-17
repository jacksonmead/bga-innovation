/**
 *------
 * BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
 * Innovation implementation : © Jean Portemer <jportemer@gmail.com>
 *
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 * -----
 *
 * innovation.js
 *
 * Innovation user interface script
 * 
 * In this file, you are describing the logic of your user interface, in Javascript language.
 *
 */

define([
    "dojo","dojo/_base/declare",
    "ebg/core/gamegui",
    "ebg/counter",
    "ebg/zone"
],
function (dojo, declare) {
    return declare("bgagame.innovation", ebg.core.gamegui, {
        constructor: function(){
            console.log('innovation constructor');
              
            // Global variables of your user interface
            this.zone = {};
            this.counter = {};
            
            this.card_dimensions = { // Dimensions in the CSS + 2
                "S recto" : {"width" : 33, "height" : 47},
                "S card" : {"width" : 47, "height" : 33},
                "M card" : {"width" : 182, "height" : 126},
                "L recto" : {"width" : 316, "height" : 456},
                "L card" : {"width" : 456, "height" : 316},
            };
            
            this.large_screen_width_limit = 1621;
            this.main_area_width_limit = 1151;
            
            this.my_hand_padding = 5; // Must be consistent to what is declared in CSS
            
            this.overlap_for_unsplayed = 3;
            this.overlap_for_splay = {
                "M card" : {"compact": 3, "expanded": 58}
            };
            
            this.HTML_class = {};

            this.HTML_class.my_hand = "M card";
            this.HTML_class.opponent_hand = "S recto";
            this.HTML_class.deck = "S recto";
            this.HTML_class.board = "M card";
            this.HTML_class.score = "S recto";
            this.HTML_class.my_score_verso = "M card";
            this.HTML_class.revealed = "M card";
            this.HTML_class.achievements = "S recto"
            this.HTML_class.special_achievements = "S card"
            
            this.nb_cards_in_row = {};
            
            this.nb_cards_in_row.my_hand = null; // Will be computed dynamically
            this.nb_cards_in_row.opponent_hand = null;
            this.nb_cards_in_row.deck = 15;
            this.nb_cards_in_row.score = null;
            this.nb_cards_in_row.my_score_verso = null;
            // For board, this.nb_cards_in_row is not defined because it's managed by the splay system: the width is defined dynamically
            this.nb_cards_in_row.revealed = 1;
            this.nb_cards_in_row.achievements = null;
            // For special achievements, this.nb_cards_in_row is not defined because it has a custom pattern
            
            this.delta = {};
            
            this.delta.my_hand = {"x": 189, "y": 133}; // +7
            this.delta.opponent_hand = {"x": 35, "y": 49}; // + 2
            this.delta.deck = {"x": 3, "y": 3}; // overlap
            this.delta.score = {"x": 35, "y": 49}; // + 2
            this.delta.my_score_verso = {"x": 189, "y": 133}; // +7
            // For board, this.delta is not defined because it's managed by the splay system: the width is defined dynamically
            this.delta.revealed = {"x": 189, "y": 133}; // +7;
            this.delta.achievements = {"x": 35, "y": 49}; // + 2
            // For special achievements, this.delta is not defined because it has a custom pattern
            
            this.incremental_id = 0;
            this.system_offset = 1000;
            
            this.selected_card = null;
            
            this.display_mode = null;
            this.view_full = null;

            this.arrows_for_expanded_mode = "&gt;&gt; &lt;&lt;"; // >> <<
            this.arrows_for_compact_mode = "&lt;&lt; &gt;&gt;"; // << >>
            this.number_of_splayed_piles = null;
            
            this.players = null;
            
            this.saved_cards = {};
            this.saved_HTML_cards = {};
            
            this.just_setupped = null;
            
            // Special flags used for Publication
            this.publication_permuted_zone = null;
            this.publication_permutations_done = null;
            this.publication_original_items = null;
            
            // Special flag used when a selection has to be made within a color pile
            this.color_pile = null;
            
            // Special flags to indicate that two colors must be chosen
            this.choose_two_colors = null;
            this.first_chosen_color = null;
            
            // Name of the normal achievements
            this.normal_achievement_names = null;
            
            // System to remember what node where last offed and what was their handlers to restore if needed
            this.deactivated_cards = null;
            this.deactivated_cards_important = null;
            this.erased_pagemaintitle_text = null;
        },
        
        //****** CODE FOR DEBUG MODE
        debug_draw: function() {
            var debug_card_list = document.getElementById("debug_card_list");
            self = this;
            this.ajaxcall("/innovation/innovation/debug_draw.html",
                            {
                                lock: true,
                                card_id: debug_card_list.selectedIndex
                            },
                             this, function(result){}, function(is_error){}
                        );      
        },
        //******
                
        /*
            setup:
            
            This method must set up the game user interface according to current game situation specified
            in parameters.
            
            The method is called each time the game interface is displayed to a player, ie:
            _ when the game starts
            _ when a player refreshes the game page (F5)
            
            "gamedatas" argument contains all datas retrieved by your "getAllDatas" PHP method.
        */
        setup: function(gamedatas)
        {
            dojo.destroy('debug_output');
            
            //****** CODE FOR DEBUG MODE
            if (!this.isSpectator && gamedatas.debug_card_list) {
                var main_area = $('main_area');
                main_area.innerHTML = "<select id='debug_card_list'></select><button id='debug_draw'>DRAW THIS CARD</button>" + main_area.innerHTML
                for(var id=0; id<gamedatas.debug_card_list.length; id++) {
                    $('debug_card_list').innerHTML += "<option value='card_'" + id + ">" + id + " - " + gamedatas.debug_card_list[id] + "</option>"
                }
                dojo.connect($('debug_draw'), 'onclick', this, 'debug_draw');
            }
            //******
        
            this.my_score_verso_window = new dijit.Dialog({ 'title': _("Cards in your score pile (opponents cannot see this)") });
            this.text_for_expanded_mode = _("Show compact");
            this.text_for_compact_mode = _("Show expanded");
            this.text_for_view_normal = _("Look at all cards in piles");
            this.text_for_view_full = _("Resume normal view");
            
            // GENERAL INFO
            this.players = gamedatas.players; 
            this.number_of_achievements_needed_to_win = gamedatas.number_of_achievements_needed_to_win;
            this.normal_achievement_names = gamedatas.normal_achievement_names;
            
            var any_player_id = Object.keys(this.players)[0]; // This is used to get a referenced on any player (who that player is does not matter) for global design purposes
                                                              // This is especially important because targetting this.player_id won't work in spectator mode
            
            // MAIN AREA
            var window_width = dojo.window.getBox().w;
            
            // Positioning and sizing the main area, decks and achievements
            var main_area_width;
            var large_screen = window_width >= this.large_screen_width_limit;
            if (large_screen) {
                main_area_width = this.main_area_width_limit + (window_width - this.large_screen_width_limit);
            }
            else {
                main_area_width = dojo.position('left-side').w;
            }
            dojo.style('main_area', 'width', main_area_width + 'px');
            
            if (!large_screen) {
                dojo.style('decks', 'display', 'inline-block');
                dojo.style('available_achievements_container', 'display', 'inline-block');
                dojo.style('available_special_achievements_container', 'display', 'inline-block');
            }
            
            // Defining the number of cards hand zone can host
            // 10 = 2 * padding
            this.nb_cards_in_row.my_hand = parseInt((dojo.contentBox('hand_container_' + any_player_id).w + this.delta.my_hand.x - this.card_dimensions['M card'].width - 10) / (this.delta.my_hand.x));
            this.nb_cards_in_row.opponent_hand = parseInt((dojo.contentBox('hand_container_' + any_player_id).w + this.delta.opponent_hand.x - this.card_dimensions['S card'].width - 10) / (this.delta.opponent_hand.x));
            
            // Setting the width of the score and achievement zones and the number of cards they can host
            var required_width_achievements_in_line = (this.number_of_achievements_needed_to_win - 1) * this.delta.achievements.x +  this.card_dimensions['S recto'].width;
            var memo_width = dojo.position('memo_' + any_player_id).w;
            var progress_width = dojo.position('progress_' + any_player_id).w;
            var score_width = progress_width - required_width_achievements_in_line - 10 - memo_width;
            if (score_width >= this.card_dimensions['S card'].width) { // There is enough space to host claimed achievements on a line
                // Save the required space for achievements and adapt the score container
                for(var player_id in this.players) {
                    dojo.style('achievement_container_' + player_id, 'width', required_width_achievements_in_line + "px");
                    dojo.style('score_container_' + player_id, 'width', score_width + "px");
                }
                this.nb_cards_in_row.achievements = 6;
                this.nb_cards_in_row.score = parseInt((score_width + this.delta.score.x - this.card_dimensions['S card'].width) / (this.delta.score.x));
            }
            else { // There is not enough space
                // Set the score container to one card in a row and adapt the achievement container
                var achievements_width = progress_width - 10 - memo_width - this.card_dimensions['S card'].width;
                for(var player_id in this.players) {
                    dojo.style('achievement_container_' + player_id, 'width', achievements_width + "px");
                    dojo.style('score_container_' + player_id, 'width', this.card_dimensions['S card'].width + "px");
                }
                this.nb_cards_in_row.achievements = parseInt((achievements_width + this.delta.achievements.x - this.card_dimensions['S card'].width) / (this.delta.achievements.x));
                this.nb_cards_in_row.score = 1;
            }
            
            // Defining the number of cards the window for score verso can host
            // Viewport size defined as minimum between the width of a hand container and the width needed to host 6 cards.
            this.nb_cards_in_row.my_score_verso = parseInt((dojo.contentBox('hand_container_' + any_player_id).w + this.delta.my_score_verso.x - this.card_dimensions['M card'].width) / (this.delta.my_score_verso.x));
            if (this.nb_cards_in_row.my_score_verso > 6) {
                this.nb_cards_in_row.my_score_verso = 6;
            }
            
            // PLAYER PANELS
            for(var player_id in this.players) {
                dojo.place(this.format_block('jstpl_player_panel', {'player_id':player_id}), $('player_board_' + player_id));
                for (var icon=1; icon<=6; icon++) {
                    var infos = {'player_id':player_id, 'icon': icon};
                    dojo.place(this.format_block('jstpl_ressource_icon', infos), $('symbols_' + player_id));
                    dojo.place(this.format_block('jstpl_ressource_count', infos), $('ressource_counts_' + player_id));
                }
            }
            
            this.addCustomTooltipToClass("score_count", _("Score"), "");
            this.addCustomTooltipToClass("hand_count", _("Number of cards in hand"), "");
            this.addCustomTooltipToClass("max_age_on_board", _("Max age on board top cards"), "");
            
            for (var icon=1; icon<=6; icon++) {
                this.addCustomTooltipToClass("ressource_" + icon, _("Number of visible ${icons} on the board").replace('${icons}', this.square('P', 'icon', icon, 'in_tooltip')), "");
            }
            
            // Counters for score
            this.counter.score = {};
            for(var player_id in this.players) {
                this.counter.score[player_id] = new ebg.counter();
                this.counter.score[player_id].create($("score_count_" + player_id));
                this.counter.score[player_id].setValue(gamedatas.score[player_id]);
            }
            
            // Counters for max age on board
            this.counter.max_age_on_board = {};
            for(var player_id in this.players) {
                this.counter.max_age_on_board[player_id] = new ebg.counter();
                this.counter.max_age_on_board[player_id].create($("max_age_on_board_" + player_id));
                this.counter.max_age_on_board[player_id].setValue(gamedatas.max_age_on_board[player_id]);
            }
            
            // Counters for ressources
            this.counter.ressource_count = {};
            for(var player_id in this.players) {
                this.counter.ressource_count[player_id] = {};
                for(var icon=1; icon<=6; icon++) {
                    this.counter.ressource_count[player_id][icon] = new ebg.counter();
                    this.counter.ressource_count[player_id][icon].create($("ressource_count_" + player_id + "_" + icon));
                    this.counter.ressource_count[player_id][icon].setValue(gamedatas.ressource_counts[player_id][icon]);
                }
            }
            
            // Action indicator
            for(var player_id in this.players) {
                dojo.place("<div id='action_indicator_" + player_id + "' class='action_indicator'></div>", $('ressources_' + player_id), 'after');
            }
            if (gamedatas.active_player !== null) {
                this.givePlayerActionCard(gamedatas.active_player, gamedatas.action_number);
            }
            
            // DECKS
            this.zone.deck = {};
            for (var age=1; age<=10; age++) {
                // Creation of the zone
                this.zone.deck[age] = this.createZone('deck', 0, age, grouped_by_age=false, counter_method="COUNT", counter_display_zero=false)
                this.setPlacementRules(this.zone.deck[age], left_to_right=true)
                
                // Add cards to zone according to the current situation
                var nb_cards_in_age = gamedatas.deck_counts[age];
                for(var i=0; i<nb_cards_in_age; i++) {
                    this.createAndAddToZone(this.zone.deck[age], i, age, null, dojo.body(), null);
                }
                
                // Current number of cards in the deck
                $('deck_count_' + age).innerHTML = nb_cards_in_age;
            }
            
            // AVAILABLE ACHIEVEMENTS
            // Creation of the zone
            this.zone.achievements = {};
            this.zone.achievements["0"] = this.createZone('achievements', 0);
            this.setPlacementRulesForAchievements();
            
            // Add cards to zone according to the current situation
            for(var i=0; i<gamedatas.unclaimed_achievements.length; i++) {
                var achievement = gamedatas.unclaimed_achievements[i];
                if (achievement.age === null) {
                    continue;
                }
                this.createAndAddToZone(this.zone.achievements["0"], i, achievement.age, null, dojo.body(), null);
                this.addTooltipForRecto(achievement, !this.isSpectator);
            }
            
            // AVAILABLE SPECIAL ACHIEVEMENTS
            // Creation of the zone
            this.zone.special_achievements = {};
            this.zone.special_achievements["0"] = this.createZone('special_achievements', 0);
            this.setPlacementRulesForSpecialAchievements();
            
            // Add cards to zone according to the current situation
            for(var i=0; i<gamedatas.unclaimed_achievements.length; i++) {
                var achievement = gamedatas.unclaimed_achievements[i];
                if (achievement.age !== null) {
                    continue;
                }
                this.createAndAddToZone(this.zone.special_achievements["0"], i, null, achievement.id, dojo.body(), null);
                this.addTooltipForCard(achievement);
            }
            
            // PLAYERS' HANDS
            this.zone.hand = {};
            for(var player_id in this.players)
            {
                // Creation of the zone
                var zone = this.createZone('hand', player_id, null, grouped_by_age=true, counter_method="COUNT", counter_display_zero=true);
                this.zone.hand[player_id] = zone;
                this.setPlacementRules(zone, left_to_right=true);
                           
                // Add cards to zone according to the current situation
                if (player_id == this.player_id) {
                    for(var i=0; i<gamedatas.my_hand.length; i++) {
                        var card = gamedatas.my_hand[i];
                        this.createAndAddToZone(zone, card.position, card.age, card.id, dojo.body(), card);
                        
                        if(gamedatas.turn0 && card.selected == 1) {
                            //dojo.addClass(this.getCardHTMLId(card.id, card.age, zone.HTML_class) , 'selected')
                            this.selected_card = card;
                        }
                        // Add tooltip
                        this.addTooltipForCard(card);
                    }
                }
                else {
                    var hand_count = gamedatas.hand_counts[player_id];
                    for(var age = 1; age <= 10; age++){
                        var nb_cards_in_age = hand_count[age];
                        for(var i=0; i<nb_cards_in_age; i++) {
                            this.createAndAddToZone(zone, i, age, null, dojo.body(), null);
                        }
                    }
                }
            }
            
            // PLAYERS' SCORE
            this.zone.score = {};
            for(var player_id in this.players)
            {
                // Creation of the zone
                this.zone.score[player_id] = this.createZone('score', player_id, null, grouped_by_age=true);
                this.setPlacementRules(this.zone.score[player_id], left_to_right=false);
                    
                // Add cards to zone according to the current situation
                var score_count = gamedatas.score_counts[player_id];
                for(var age = 1; age <= 10; age++){
                    var nb_cards_in_age = score_count[age];
                    for(var i=0; i<nb_cards_in_age; i++) {
                        this.createAndAddToZone(this.zone.score[player_id], i, age, null, dojo.body(), null);
                    }
                }
            }
            
            // My score: create an extra zone to show the versos of the cards at will in a windows
            if (!this.isSpectator) {
                this.my_score_verso_window.attr("content", "<div id='my_score_verso'></div><a id='score_close_window' class='bgabutton bgabutton_blue'>Close</a>");
                this.zone.my_score_verso = this.createZone('my_score_verso', this.player_id, grouped_by_age=true)
                this.setPlacementRules(this.zone.my_score_verso, left_to_right=true);
                for(var i=0; i<gamedatas.my_score.length; i++) {
                    var card = gamedatas.my_score[i];
                    this.createAndAddToZone(this.zone.my_score_verso, card.position, card.age, card.id, dojo.body(), card);
                    // Add tooltip
                    this.addTooltipForCard(card);
                }
                // Provide links to get access to that window and close it
                dojo.connect($('score_text_' + this.player_id), 'onclick', this, 'clic_display_score_window');
                dojo.connect($('score_close_window'), 'onclick', this, 'clic_close_score_window');
            }
            
            // PLAYERS' ACHIEVEMENTS
            for(var player_id in this.players)
            {
                // Creation of the zone
                this.zone.achievements[player_id] = this.createZone('achievements', player_id);
                this.setPlacementRules(this.zone.achievements[player_id], left_to_right=true);
                    
                // Add cards to zone according to the current situation
                var achievements = gamedatas.claimed_achievements[player_id];
                for(var i = 0; i < achievements.length; i++){
                    var achievement = achievements[i];
                    if (achievement.age !== null) { // Normal achievement
                        this.createAndAddToZone(this.zone.achievements[player_id], i, achievement.age, null, dojo.body(), null);
                        this.addTooltipForRecto(achievement, false);
                    }
                    else {
                        this.createAndAddToZone(this.zone.achievements[player_id], i, null, achievement.id, dojo.body(), null);
                        this.addTooltipForCard(achievement);
                    }    
                }
            }
            
            if (!this.isSpectator) {
                dojo.query('#progress_' + this.player_id + ' .score_container > p, #progress_' + this.player_id + ' .achievement_container > p').addClass('two_lines');
                dojo.query('#progress_' + this.player_id + ' .score_container > p')[0].innerHTML += '<br /><span class="minor_information">' + _('(click to look at the cards)') + '</span>';
                dojo.query('#progress_' + this.player_id + ' .achievement_container > p')[0].innerHTML += '<br /><span class="minor_information">' + _('(${n} needed to win)').replace('${n}', gamedatas.number_of_achievements_needed_to_win) + '</span>';
            }
            
            // PLAYER BOARD
            // Display mode
            if (this.isSpectator) { // The wishes for splaying can't be saved if the spectator refreshes
                // We set manually a default value
                // The spectator can later change this using the buttons, the same way the players do
                this.display_mode = true; // Show expanded by default
                this.view_full = false; // Don't show view full by default
            }
            else {
                this.display_mode = gamedatas.display_mode;
                this.view_full = gamedatas.view_full;
            }
            
            // Piles
            this.zone.board = {};
            this.number_of_splayed_piles = 0;
            for(var player_id in this.players)
            {
                this.zone.board[player_id] = {};
                var player_board = gamedatas.board[player_id];
                var player_splay_directions = gamedatas.board_splay_directions[player_id];
                var player_splay_directions_in_clear = gamedatas.board_splay_directions_in_clear[player_id];
                
                for(var color = 0; color < 5; color++){
                    var splay_direction = player_splay_directions[color];
                    var splay_direction_in_clear = player_splay_directions_in_clear[color];
                    
                    // Creation of the zone
                    this.zone.board[player_id][color] = this.createZone('board', player_id, color, grouped_by_age=false)
                    this.setSplayMode(this.zone.board[player_id][color], splay_direction)
                    // Splay indicator
                    dojo.addClass('splay_indicator_' + player_id + '_' + color, 'splay_' + splay_direction);
                    if (splay_direction > 0) {
                        this.number_of_splayed_piles++;
                        this.addCustomTooltip('splay_indicator_' + player_id + '_' + color, dojo.string.substitute(_('This pile is splayed ${direction}.'), {'direction': '<b>' + splay_direction_in_clear + '</b>'}), '')
                    }
                    
                    // Add cards to zone according to the current situation
                    var cards_in_pile = player_board[color];
                    for(var i = 0; i < cards_in_pile.length; i++){
                        var card = cards_in_pile[i];
                        this.createAndAddToZone(this.zone.board[player_id][color], card.position, card.age, card.id, dojo.body(), card)
                        
                        // Add tooltip
                        this.addTooltipForCard(card);
                    }
                }
            }
            
            // Button for view full
            this.addButtonForViewFull();
            
            // Button for display mode
            this.addButtonForSplayMode();
            if (this.number_of_splayed_piles > 0) { // If at least there is one splayed color on any player board
                this.enableButtonForSplayMode();
            }
            
            // REVEALED ZONES
            this.zone.revealed = {};    
            for(var player_id in this.players)
            {    
                var zone = this.createZone('revealed', player_id, null, grouped_by_age=false);
                this.zone.revealed[player_id] = zone;
                dojo.style(zone.container_div, 'display', 'none');
                this.setPlacementRules(zone, left_to_right=true);
                
                var revealed_cards = gamedatas.revealed[player_id];
                for(var i = 0; i < revealed_cards.length; i++){
                    var card = revealed_cards[i];
                    this.createAndAddToZone(zone, card.position, card.age, card.id, dojo.body(), card)
                        
                    // Add tooltip
                    this.addTooltipForCard(card);
                }
            }
            
            // MEMO
            this.addTooltipForMemo();
            
            // CURRENT DOGMA CARD EFFECT
            if (gamedatas.JSCardEffectQuery !== null) {
                // Highlight the current effect if visible
                dojo.query(gamedatas.JSCardEffectQuery).addClass('current_effect');
            }
            
            // Force refresh page on resize if width changes
            /*var window_width = dojo.window.getBox().w;
            window.onresize = function() {
                if (window.RT) {
                    clearTimeout(window.RT);
                }
                window.RT = setTimeout(function() {
                    if(window_width != dojo.window.getBox().w) { // If there is an actual change of the width of the viewport
                        this.location.reload(false);
                    }
                }, 100);
            }*/
            
            // Setup game notifications to handle (see "setupNotifications" method below)
            this.setupNotifications();
            
            this.just_setupped = true;
            
            console.log("Ending game setup");
        },
        
        ///////////////////////////////////////////////////
        //// Simple handler management system
        // this.on replace dojo.connect
        // this.off enables to disconnect the handler of one particular event on the object attached with this.on
        // this.restart enables to reconnect the last handler of one particular event
        
        on: function (filter, event, method) {
            var self = this;
            filter.forEach(
                function(node, index, arr) {
                    if (node.last_handler === undefined) {
                        node.last_handler = {}
                    }
                    node.last_handler[event] = method;
                    self.connect(node, event, method);
                }
           );
        },

        off: function (filter, event) {
            var self = this;
            filter.forEach(
                function(node, index, arr) {
                    self.disconnect(node, event);
                }
            );
        },
        
        restart : function(filter, event) {
            var self = this;
            filter.forEach(
                function(node, index, arr) {
                    self.connect(node, event, node.last_handler[event]);
                }
            );
        },
        
        ///////////////////////////////////////////////////
        //// Game & client states
        
        // onEnteringState: this method is called each time we are entering into a new game state.
        //                  You can use this method to perform some user interface changes at this moment.
        //
        onEnteringState: function(stateName, args)
        {
            console.log('Entering state: '+stateName)
            console.log(args)
            
            if (this.just_setupped) { // Here, do things that have to be done on setup but that cannot be done inside the function
                
                for(var player_id in this.players) { // Displaying player BGA scores
                    this.scoreCtrl[player_id].setValue(this.players[player_id].player_score); // BGA score = number of claimed achievements
                    var tooltip_help = _("Number of achievements. ${n} needed to win").replace('${n}', this.number_of_achievements_needed_to_win);
                    this.addCustomTooltip('player_score_' + player_id, tooltip_help, "");
                    this.addCustomTooltip('icon_point_' + player_id, tooltip_help, "");
                }
                
                // Now the game is really truly setupped
                this.just_setupped = false;
            }

            // Things to do for all players
            switch(stateName)
            {
            case 'turn0':
                if (args.args.team_game) {
                    this.addToLog(args.args.messages[this.player_id]);
                }
            
                if (this.selected_card !== null) {
                    dojo.addClass(this.getCardHTMLId(this.selected_card.id, this.selected_card.age, this.HTML_class.my_hand), 'selected')
                }
                break;
            case 'playerTurn':
                this.destroyActionCard();
                this.givePlayerActionCard(this.getActivePlayerId(), args.args.action_number);
                break;
            case 'whoBegins':
                dojo.query(".selected").removeClass("selected");
                break;
            case 'dogmaEffect':
            case 'playerInvolvedTurn':
                // Highlight the current effect if visible
                dojo.query(args.args.JSCardEffectQuery).addClass("current_effect");
                break;
            case 'interPlayerInvolvedTurn':
            case 'interDogmaEffect':
                dojo.query(".current_effect").removeClass("current_effect");
                break;
            case 'gameEnd':
                // Set player panels for the last time properly        
                var result = args.args.result;
                for (var p=0; p<result.length;p++) {
                    var player_result = result[p];
                    var player_id = player_result.player;
                    var player_score = player_result.score;
                    var player_score_aux = player_result.score_aux;
                    
                    // Gold star => BGA score: remove the tooltip which says that it's the number of achievements because it is not the case in end by score or by dogma and set the counter to its appropriate value
                    this.removeTooltip('player_score_' + player_id);
                    this.scoreCtrl[player_id].setValue(player_score);
                    
                    // Silver star => BGA tie breaker: remove the tooltip and set the counter to its appropriate value
                    this.removeTooltip('score_count_container_' + player_id);
                    this.counter.score[player_id].setValue(player_score_aux);
                }
                break;
            }
            
            switch(stateName) {
            case 'playerInvolvedTurn':
            case 'interPlayerInvolvedTurn':
            case 'interactionStep':
            case 'interInteractionStep':
            case 'preSelectionMove':
            case 'interSelectionMove':
                var player_name = args.args.player_id == this.player_id ? args.args.player_name_as_you : args.args.player_name;
                $('pagemaintitletext').innerHTML = $('pagemaintitletext').innerHTML.replace('${player}', player_name);
                break;
            }
            
            // Is it a state I'm supposed to play?
            if (this.isCurrentPlayerActive()) {
                // I am supposed to play
                
                switch(stateName)
                {   
                case 'turn0':
                    // Reset tooltips for hand (or board: no card)
                    this.destroyMyHandAndBoardTooltips();
                    this.createMyHandAndBoardTooltipsWithActions();
                    
                    var cards_in_hand = this.selectCardsInHand();
                    cards_in_hand.addClass("clickable");
                    this.on(cards_in_hand, 'onclick', 'action_clicForInitialMeld');
                    break;
                case 'playerTurn':
                    // Reset tooltips for hand or board
                    this.destroyMyHandAndBoardTooltips();
                    this.createMyHandAndBoardTooltipsWithActions();
                
                    // Claimable achievements (achieve action)
                    if (args.args.claimable_ages.length > 0) {
                        var claimable_achievements = this.selectClaimableAchievements(args.args.claimable_ages);
                        claimable_achievements.addClass("clickable").addClass("clickable_important");
                        this.on(claimable_achievements, 'onclick', 'action_clicForAchieve');
                    }
                    
                    // Top drawable card on deck (draw action)
                    if (args.args.age_to_draw <= 10) {
                        var drawable_card = this.selectDrawableCard(args.args.age_to_draw);
                        drawable_card.addClass("clickable");
                        this.on(drawable_card, 'onclick', 'action_clicForDraw');
                    }
                    
                    // Cards in hand (meld action)
                    var cards_in_hand = this.selectCardsInHand();
                    cards_in_hand.addClass("clickable");
                    this.off(cards_in_hand, 'onclick'); // Remove possible stray handler from initial meld.
                    this.on(cards_in_hand, 'onclick', 'action_clicForMeld');
                    
                    // Cards on board (dogma action)
                    var cards_on_board = this.selectActiveCardsOnBoard();
                    cards_on_board.addClass("clickable");
                    this.on(cards_on_board, 'onclick', 'action_clicForDogma');
                    break;
                case 'selectionMove':
                    this.choose_two_colors = args.args.special_type_of_choice == 5 /* choose_two_colors */;
                    if (args.args.special_type_of_choice == 0) {
                        // Allowed selected cards by the server
                        var visible_selectable_cards = this.selectCardsFromList(args.args._private.visible_selectable_cards);
                        if (visible_selectable_cards !== null) {
                            visible_selectable_cards.addClass("clickable");
                            this.on(visible_selectable_cards, 'onclick', 'action_clicForChoose');
                            if (args.args._private.must_show_score) {
                                this.my_score_verso_window.show();
                            }
                        }
                        var selectable_rectos = this.selectRectosFromList(args.args._private.selectable_rectos);
                        if (selectable_rectos !== null) {
                            selectable_rectos.addClass("clickable");
                            this.on(selectable_rectos, 'onclick', 'action_clicForChooseRecto');
                        }
                    }
                    else if (args.args.special_type_of_choice == 6 /* rearrange */) {
                        this.off(dojo.query('#change_display_mode_button'), 'onclick');
                        for(var color=0; color<5; color++) {
                            var zone = this.zone.board[this.player_id][color];
                            this.setSplayMode(zone, zone.splay_direction, full_visible=true); // Show all cards
                        }
                        this.publication_permutations_done = [];
                        
                        var selectable_cards = this.selectAllCardsOnBoard();
                        selectable_cards.addClass("clickable");
                        this.on(selectable_cards, 'onclick', 'publicationClicForMove');
                    }
                    
                    if (args.args.color_pile !== null) { // The selection involves cards in pile
                        this.color_pile = args.args.color_pile;
                        var zone = this.zone.board[this.player_id][this.color_pile];
                        this.setSplayMode(zone, zone.splay_direction, full_visible=true); // Show all cards of that pile
                    }
                    
                    if (args.args.splay_direction !== null) {
                        // Update tooltips for cards of piles that can be splayed
                        this.destroyMyBoardTooltipsOfColors(args.args.splayable_colors);
                        this.createMyBoardTooltipsForColorsWithSplayingActions(args.args.splayable_colors, args.args.splayable_colors_in_clear, args.args.splay_direction, args.args.splay_direction_in_clear);
                    }
                    
                    if ((args.args.can_pass || args.args.can_stop) && (args.args.special_type_of_choice == 0 || args.args.special_type_of_choice == 6 /* rearrange */) && args.args.splay_direction === null) {
                        $('pagemaintitletext').innerHTML += " " + _("or")
                    }
                    break;
                }
            }
            else {
                // I am not supposed to play
                switch(stateName)
                {
                case 'turn0':
                    // Reset tooltips for hand (or board: no card)
                    this.destroyMyHandAndBoardTooltips();
                    this.createMyHandAndBoardTooltipsWithActions();
                    
                    var cards_in_hand = this.selectCardsInHand();
                    cards_in_hand.addClass("clickable");
                    this.on(cards_in_hand, 'onclick', 'action_clickForUpdatedInitialMeld');
                    break;
                case 'selectionMove':
                    // Add more information about the cards which can be selected
                    if (args.args.splay_direction !== null) {
                        var end_of_message = []
                        for (var i=0; i < args.args.splayable_colors_in_clear.length; i++) {
                            end_of_message.push(dojo.string.substitute(_("splay his ${cards} ${direction}"), {'cards': args.args.splayable_colors_in_clear[i], 'direction': args.args.splay_direction_in_clear}))
                        }
                        $('pagemaintitletext').innerHTML += " " + end_of_message.join(", ");  
                    }
                    
                    // Add if the player can pass or stop
                    if (args.args.can_pass || args.args.can_stop) {
                        if (args.args.can_pass) {
                            var message = " " + _("or pass");
                        }
                        else  { // args.can_stop
                            var message = " " + _("or stop");    
                        }
                        $('pagemaintitletext').innerHTML += message;
                    }
                    break;
                }
            }
        },

        // onLeavingState: this method is called each time we are leaving a game state.
        //                 You can use this method to perform some user interface changes at this moment.
        //
        onLeavingState: function(stateName)
        {
            this.deactivateClickEvents(); // If this was not done after a click event (game replay for instance)
            
            // Was it a state I was supposed to play?
            if (this.isCurrentPlayerActive()) {
                // I was supposed to play
                
                switch(stateName)
                {   
                case 'playerTurn':
                    // Reset tooltips for hand or board
                    this.destroyMyHandAndBoardTooltips(true);
                    this.createMyHandAndBoardTooltipsWithoutActions(true);
                case 'selectionMove':
                    // Reset tooltips for board (in case there was a splaying choice)
                    this.destroyAllMyBoardTooltips();
                    this.createAllMyBoardTooltipsWithoutActions();
                    this.my_score_verso_window.hide();
                }
            }
        }, 

        // onUpdateActionButtons: in this method you can manage "action buttons" that are displayed in the
        //                        action status bar (ie: the HTML links in the status bar).
        //        
        onUpdateActionButtons: function(stateName, args)
        {
            if(this.isCurrentPlayerActive()) {            
                switch(stateName) {
                case 'playerTurn':
                    // Red buttons for claimable_achievements
                    for (var i=0; i<args.claimable_ages.length; i++) {
                        var age = args.claimable_ages[i];
                        var HTML_id = "achieve_" + age;
                        this.addActionButton(HTML_id, _("Achieve ${age}").replace("${age}", this.square('N', 'age', age)), "action_clicForAchieve");
                        dojo.removeClass(HTML_id, 'bgabutton_blue');
                        dojo.addClass(HTML_id, 'bgabutton_red');
                    }
                    
                    // Blue buttons for draw action (or red if taking this action would finish the game)
                    if (args.age_to_draw <= 10) {
                        this.addActionButton("take_draw_action", _("Draw a ${age}").replace("${age}", this.square('N', 'age', args.age_to_draw)), "action_clicForDraw")
                    }
                    else {
                        this.addActionButton("take_draw_action", _("Finish the game (attempt to draw above ${age_10})").replace('${age_10}', this.square('N', 'age', 10)), "action_clicForDraw")
                    }
                    dojo.place("<span id='extra_text'> , " + _("meld or dogma") + "</span>", "take_draw_action", "after")
                    break;
                case 'selectionMove':
                    var special_type_of_choice_with_buttons = args.special_type_of_choice != 0 && args.special_type_of_choice != 6 /* rearrange */;
                    var splay_choice = args.splay_direction !== null;
                    if (special_type_of_choice_with_buttons) {
                        // Add a button for each available options
                        for(var i=0; i<args.options.length; i++) {
                            var option = args.options[i];
                            this.addActionButton("choice_" + option.value, _(option.text), "action_clicForChooseSpecialOption")
                        }
                        var last_button = "choice_" + args.options[args.options.length-1].value;
                    }
                    else if (splay_choice) {
                        // Add button for splaying choices
                        for (var i=0; i<args.splayable_colors.length; i++) {
                            if (i > 0) {
                                dojo.place("<span id='extra_text'> ,</span>", "splay_" + args.splayable_colors[i-1], "after")
                            }
                            this.addActionButton("splay_" + args.splayable_colors[i], dojo.string.substitute(_("Splay your ${cards} ${direction}"), {'cards': args.splayable_colors_in_clear[i], 'direction': args.splay_direction_in_clear}), "action_clicForSplay")
                        }
                        var last_button = "splay_" + args.splayable_colors[args.splayable_colors.length-1];
                    }
                
                    // Add a button if I can pass or stop
                    if (args.can_pass || args.can_stop) {
                        if (special_type_of_choice_with_buttons || splay_choice) {
                            dojo.place("<span id='extra_text'> " + _("or") + "</span>", last_button, "after")
                        }
                        if (args.can_pass) {
                            var action = "pass";
                            var message = _("Pass");
                        }
                        else  { // args.can_stop
                            var action = "stop";
                            var message = _("Stop");    
                        }
                        this.addActionButton(action, message, "action_clicForPassOrStop");    
                    }
                    break;
                }
            }
        },        

        ///////////////////////////////////////////////////
        //// Utility methods
        
        /*
        
            Here, you can defines some utility methods that you can use everywhere in your javascript
            script.
        
        */
        
        setDefault : function(variable, default_value) {
            return variable === undefined ? default_value : variable;
        },
        
        addToLog : function(message) {
            HTML = dojo.string.substitute('<div class="log" style="height: auto; display: block; color: rgb(0, 0, 0);"><div class="roundedbox">${msg}</div></div>',
                {'msg': message})
            dojo.place(HTML, $('logs'), 'first')
        },
        
        addButtonForViewFull : function() {
            var button_text = this.view_full ? this.text_for_view_full : this.text_for_view_normal;
            
            if (this.isSpectator) {
                var player_panel = dojo.query(".player:nth-of-type(1)")[0];
                var player_id = dojo.attr(player_panel, 'id').substr(7); // Get the first player (on top)
            }
            else {
                var player_id = this.player_id;
            }
            
            var button = this.format_string_recursive("<i id='change_view_full_button' class='bgabutton bgabutton_gray'>${button_text}</i>", {'button_text':button_text, 'i18n':['button_text']});
            
            dojo.place(button, 'name_' + player_id, 'after');
            this.addCustomTooltip('change_view_full_button', '<p>' + _('Use this to look at all the cards in board piles.') + '</p>', "")
            this.on(dojo.query('#change_view_full_button'), 'onclick', 'toggle_view');
        },
        
        addButtonForSplayMode : function() {
            var button_text = this.display_mode ? this.text_for_expanded_mode : this.text_for_compact_mode;
            var arrows =  this.display_mode ? this.arrows_for_expanded_mode : this.arrows_for_compact_mode;
            
            var button = this.format_string_recursive("<i id='change_display_mode_button' class='bgabutton bgabutton_gray'>${arrows} ${button_text}</i>", {'arrows':arrows, 'button_text':button_text, 'i18n':['button_text']});
            
            dojo.place(button, 'change_view_full_button', 'after');
            this.addCustomTooltip('change_display_mode_button', '<p>' + _('<b>Expanded mode:</b> the splayed piles are displayed like in real game, to show which icons are made visible.') + '</p>' +
                                                                '<p>' + _('<b>Compact mode:</b> the splayed piles are displayed with minimum offset, to save space.') + '</p>', "")
            
            this.disableButtonForSplayMode(); // Disabled by default
        },
        
        disableButtonForSplayMode : function() {
            var change_display_mode_button = dojo.query('#change_display_mode_button');
            this.off(change_display_mode_button, 'onclick');
            change_display_mode_button.addClass('disabled');
        },
        
        enableButtonForSplayMode : function() {
            var change_display_mode_button = dojo.query('#change_display_mode_button');
            this.on(change_display_mode_button, 'onclick', 'toggle_displayMode');
            change_display_mode_button.removeClass('disabled');
        },
        
        /*
         * Id management
         */
        uniqueId : function() {
            this.incremental_id++;
            return this.incremental_id;
        },

        uniqueIdForCard : function(age) {
            return this.system_offset * this.uniqueId() + age;
        },
        
        /*
         * Icons and little stuff
         */

        square : function(size, type, key, context) {
            // Default values
            context = this.setDefault(context, null);
            ///////
            
            return "<span class='square " + size + " " + type + "_" + key + (context !== null ? " " + context : "") + "'></span>"
        },
        
        all_icons : function(size, type) {
            return "<span class='all_icons " + size + " " + type + "'></span>"
        },
         
        /*
         * Tooltip management
         */
        shapeTooltip : function(help_HTML, action_HTML) {
            var help_string_passed = help_HTML != "";
            var action_string_passed = action_HTML != "";
            var HTML = "<table class='tooltip'>";
            if (help_string_passed) {
                HTML += "<tr><td>" + this.square('basic', 'icon', 'help', 'in_tooltip') + "</td><td class='help in_tooltip'>" + help_HTML + "</td></tr>";
            }
            if (action_string_passed) {
                HTML += "<tr><td>" + this.square('basic', 'icon', 'action', 'in_tooltip') + "</td><td class='action in_tooltip'>" + action_HTML + "</td></tr>";
            }
            HTML += "</table>"
            return HTML;
        },
        
        addCustomTooltip : function(nodeId, help_HTML, action_HTML, delay) {
            // Default values
            delay = this.setDefault(delay, undefined);
            ///////
            this.addTooltipHtml(nodeId, this.shapeTooltip(help_HTML, action_HTML), delay);
        },
        
        addCustomTooltipToClass : function(cssClass, help_HTML, action_HTML, delay) {
            // Default values
            delay = this.setDefault(delay, undefined);
            ///////
            this.addTooltipHtmlToClass(cssClass, this.shapeTooltip(help_HTML, action_HTML), delay);
        },
        
        addTooltipForCard : function(card) {
            var zone = this.getZone(card['location'], card.owner, card.age, card.color);
            var HTML_id = this.getCardHTMLId(card.id, card.age, zone.HTML_class);
            var HTML_help = this.createCard(card.id, card.age, "L card", card);
            this.saved_cards[card.id] = card;
            this.saved_HTML_cards[card.id] = HTML_help; // Save this tooltip in cas it needs to be rebuilt
            this.addCustomTooltip(HTML_id, HTML_help, "");
        },
        
        addTooltipForRecto : function(card, display_condition_for_claiming) {
            var zone = this.getZone(card['location'], card.owner, card.age);
            var id = this.getCardIdFromPosition(zone, card.position, card.age)
            var HTML_id = this.getCardHTMLId(id, card.age, zone.HTML_class);
            var HTML_help = this.createCard(id, card.age, "L recto", null);
            
            condition_for_claiming = dojo.string.substitute(_('You can take an action to claim this age if you have at least ${n} points in your score pile and at least one top card of value equal or higher than ${age} on your board.'), {'age': this.square('N', 'age', card.age), 'n': 5 * card.age});
            this.addCustomTooltip(HTML_id, HTML_help, display_condition_for_claiming ? "<div class='under L_recto'>" + condition_for_claiming + "</div>" : '');
        },
        
        addTooltipForMemo : function() {
            var bullet = "&bull;"
            var big_bullet = "&#9679;"
            
            // Divs
            var score_div = this.createAdjustedContent(bullet + _('Score').toUpperCase() + bullet, 'score_txt', '', 18);
            var achievements_div = this.createAdjustedContent(bullet + _('Achievements').toUpperCase() + bullet, 'achievements_txt', '', 18);
            
            var actions_text = _("${Actions} You must take two actions on your turn, in any order. You may perform the same action twice.");
            actions_text = dojo.string.substitute(actions_text, {'Actions' : "<span class='actions_header'>" + _("Actions :").toUpperCase() + "</span>"})
            var actions_div = this.createAdjustedContent(actions_text, 'actions_txt memo_block', '', 12);
            
            var meld_title = this.createAdjustedContent(_("Meld").toUpperCase(), 'meld_title memo_block', '', 30);
            var meld_parag_text = _("Play a card from your hand to your board, on stack on matching color. Continue any splay if present.");
            var meld_parag = this.createAdjustedContent(meld_parag_text, 'meld_parag memo_block', '', 12);
            
            var draw_title = this.createAdjustedContent(_("Draw").toUpperCase(), 'draw_title memo_block', '', 30);
            var draw_parag_text = _("Take a card of value equal to your highest top card from the supply piles. If empty, draw from the next available higher pile.");
            var draw_parag = this.createAdjustedContent(draw_parag_text, 'draw_parag memo_block', '', 12);
            
            var achieve_title = this.createAdjustedContent(_("Achieve").toUpperCase(), 'achieve_title memo_block', '', 30);
            var achieve_parag_text = _("To claim, must have score of at least 5x the age number in points, and a top card of equal or higher value. Points are kept, not spent.");
            var achieve_parag = this.createAdjustedContent(achieve_parag_text, 'achieve_parag memo_block', '', 12);
            
            var dogma_title = this.createAdjustedContent(_("Dogma").toUpperCase(), 'dogma_title memo_block', '', 30);
            var dogma_parag_text = _("Pick a top card on your board. Execute each effect on it, in order.") +
                                    "<ul><li>" + big_bullet + " " + _("I Demand effects are executed by each player with fewer of the featured icon than you, going clockwise. Read effects aloud to them.") + "</li>" +
                                    "<li>" + big_bullet + " " + _("Non-demand effects are executed by opponents before you, if they have at leadt as many or more of the featured icon, going clockwise.") + "</li>" +
                                    "<li>" + big_bullet + " " + _("If any opponent shared a non-demand effect, take a single free Draw action at the conclusion of your Dogma action.") + "</li></ul>";
            var dogma_parag = this.createAdjustedContent(dogma_parag_text, 'dogma_parag memo_block', '', 12);
            
            var tuck_title = this.createAdjustedContent(_("Tuck").toUpperCase(), 'tuck_title memo_block', '', 30);
            var tuck_parag_text = _("A tucked card goes to the bottom of the pile of its color. Tucking a card into an empty pile starts a new one.");
            var tuck_parag = this.createAdjustedContent(tuck_parag_text, 'tuck_parag memo_block', '', 12);
            
            var return_title = this.createAdjustedContent(_("Return").toUpperCase(), 'return_title memo_block', '', 30);
            var return_parag_text = _("To return a card, place it at the bottom of its matching supply pile. If you return many cards, you choose the order.");
            var return_parag = this.createAdjustedContent(return_parag_text, 'return_parag memo_block', '', 12);
            
            var draw_and_x_title = this.createAdjustedContent(_("DRAW and X"), 'draw_and_x_title memo_block', '', 30);
            var draw_and_x_parag_text = _("If instructed to Draw and Meld, Score, or tuck, you must use the specific card drawn for the indicated action.");
            var draw_and_x_parag = this.createAdjustedContent(draw_and_x_parag_text, 'draw_and_x_parag memo_block', '', 12);
            
            var splay_title = this.createAdjustedContent(_("Splay").toUpperCase(), 'splay_title memo_block', '', 30);
            var splay_parag_text = _("To splay, fan out the color as shown below. A color is only ever splayed in one direction. New cards tucked or melded continue the splay.");
            var splay_parag = this.createAdjustedContent(splay_parag_text, 'splay_parag memo_block', '', 12);
            
            var erase_block = "<div class='erase_block memo_block'></div>"
            
            var splayed_left_example = this.createAdjustedContent(_("Splayed left"), 'splayed_left_example memo_block', '', 12);
            var splayed_right_example = this.createAdjustedContent(_("Splayed right"), 'splayed_right_example memo_block', '', 12);
            var splayed_up_example = this.createAdjustedContent(_("Splayed up"), 'splayed_up_example memo_block', '', 12);
            
            var empty_piles_title = this.createAdjustedContent(_("Empty piles").toUpperCase(), 'empty_piles_title memo_block', '', 30);
            var empty_piles_parag_text = _("When drawing from an empty pile for <b>any reason</b>, draw from the next higher pile.");
            var empty_piles_parag = this.createAdjustedContent(empty_piles_parag_text, 'empty_piles_parag memo_block', '', 12);
            
            var age_1_3 = _("Age 1-3");
            var age_4_10 = _("Age 4-10");
            var age_7_10 = _("Age 7-10");
            var age_1_10= _("Age 1-10");
            
            var icon_4_ages = this.createAdjustedContent(age_1_3, 'icon_4_ages memo_block', '', 12);
            var icon_5_ages = this.createAdjustedContent(age_4_10, 'icon_5_ages memo_block', '', 12);
            var icon_6_ages = this.createAdjustedContent(age_7_10, 'icon_6_ages memo_block', '', 12);
            
            var icon_1_ages = this.createAdjustedContent(age_1_10, 'icon_1_ages memo_block', '', 12);
            var icon_2_ages = this.createAdjustedContent(age_1_10, 'icon_2_ages memo_block', '', 12);
            var icon_3_ages = this.createAdjustedContent(age_1_10, 'icon_3_ages memo_block', '', 12);
            
            var colors_title = this.createAdjustedContent(_("Colors:"), 'colors_title memo_block', '', 12);
            var blue_icon = this.createAdjustedContent(_("Blue"), 'blue_icon memo_block', '', 12);
            var yellow_icon = this.createAdjustedContent(_("Yellow"), 'yellow_icon memo_block', '', 12);
            var red_icon = this.createAdjustedContent(_("Red"), 'red_icon memo_block', '', 12);
            var green_icon = this.createAdjustedContent(_("Green"), 'green_icon memo_block', '', 12);
            var purple_icon = this.createAdjustedContent(_("Purple"), 'purple_icon memo_block', '', 12);
            
            // Recto
            recto_content = "";
            recto_content += score_div;
            recto_content += achievements_div;
            recto_content += actions_div;
            
            recto_content += meld_title + meld_parag;
            recto_content += draw_title + draw_parag;
            recto_content += achieve_title + achieve_parag;
            
            recto_content += dogma_title + dogma_parag;
            
            // Verso
            verso_content = "";
            verso_content += score_div;
            verso_content += achievements_div;
            
            verso_content += tuck_title + tuck_parag;
            verso_content += return_title + return_parag;
            verso_content += draw_and_x_title + draw_and_x_parag;
            
            verso_content += splay_title + splay_parag + erase_block;
            verso_content += splayed_left_example + splayed_right_example + splayed_up_example;
            
            verso_content += empty_piles_title + empty_piles_parag;
            
            verso_content += icon_4_ages + icon_5_ages + icon_6_ages;
            verso_content += icon_1_ages + icon_2_ages + icon_3_ages;
            
            verso_content += colors_title + blue_icon + yellow_icon;
            verso_content += red_icon + green_icon + purple_icon;
            
            // Assembling
            var div_recto = "<div class='memo_recto M'>" + recto_content + "</div>"
            var div_verso = "<div class='memo_verso M'>" + verso_content + "</div>"
            this.addTooltipHtmlToClass('memo_recto', div_recto + div_verso);
        },
        
        createAdjustedContent : function(content, HTML_class, size, font_max, width_margin, height_margin) {
            // Default values
            width_margin = this.setDefault(width_margin, 0);
            height_margin = this.setDefault(height_margin, 0);
            ///////
            
            // Problem: impossible to get suitable text size because it is not possible to get the width and height of an element still unattached
            // Solution: first create the title hardly attached to the DOM, then destroy it and set the title in tooltip properly
            // Create temporary title hardly attached on the DOM
            var HTML_id_parent = 'temp_parent';
            var HTML_id = 'temp';
            var div_title = "<div id='" + HTML_id_parent + "' class='" + HTML_class + " " + size + "'><span id='" + HTML_id + "' >" + content + "</span></div>";
            
            dojo.place(div_title, dojo.body());
            
            // Determine the font-size between 1 and 30px which enables to fill the container without overflow
            var font_size = font_max;
            var anc_font_size;
            var HTML_id_parent = $(HTML_id_parent);
            var HTML_id = $(HTML_id);
            dojo.addClass(HTML_id, 'font_size_' + font_size);
            while(font_size > 1 && (dojo.position(HTML_id).w + width_margin > dojo.position(HTML_id_parent).w || dojo.position(HTML_id).h + height_margin > dojo.position(HTML_id_parent).h)) {
                anc_font_size = font_size;
                font_size -= 1;
                dojo.removeClass(HTML_id, 'font_size_' + anc_font_size);
                dojo.addClass(HTML_id, 'font_size_' + font_size);
            }
            
            // Destroy the piece of HTML used for determination
            dojo.destroy(HTML_id_parent);
            
            // Create actual HTML which will be added in tooltip
            return "<div class='" + HTML_class + " " + size + "'><span class='font_size_" + font_size + "'>" + content + "</span></div>";            
        },
        
        createDogmaEffectText : function(text, dogma_symbol, size, type_of_effect) {
            text = this.parseForRichedText(text, size);
            text = this.getSymbolIconInDogma(dogma_symbol) + " <strong>:</strong> " + text;
            return "<div class='effect " + size + " " + type_of_effect + "'>" + this.square(size, 'icon', dogma_symbol, 'in_tooltip') + "<span class='effect_text " + size + "'>" + text + "<span></div>";
        },
        
        parseForRichedText : function(text, size) {
            text = text.replace(new RegExp("\\$\\{I demand\\}" , "g"), "<strong class='i_demand'>" + _("I demand") + "</strong>");
            text = text.replace(new RegExp("\\$\\{immediately\\}" , "g"), "<strong class='immediately'>" + _("immediately") + "</strong>");
            text = text.replace(new RegExp("\\$\\{icons_1_to_6\\}" , "g"), this.all_icons(size, 'in_tooltip'));
            for (var age=1; age <= 10; age++) {
                text = text.replace(new RegExp("\\$\\{age_" + age + "\\}" , "g"), this.square(size, 'age', age, 'in_tooltip'));
            }
            for (var symbol=1; symbol <= 6; symbol++) {
                text = text.replace(new RegExp("\\$\\{icon_" + symbol + "\\}" , "g"), this.square(size, 'icon', symbol, 'in_tooltip'));
            }
            return text;
        },
        
        getAgeIconInDogma : function(age) {
            return "<span class='icon_in_dogma icon_in_dogma_age_" + age + "' ></span>"
        },
        
        getSymbolIconInDogma : function(symbol) {
            return "<span class='icon_in_dogma icon_in_dogma_symbol_" + symbol + "' ></span>"
        },
        
        /*
         * Special tooltip management for my hand and board cards
         */
        destroyMyHandAndBoardTooltips : function(all_cards_on_board) {
            // Default values
            all_cards_on_board = this.setDefault(all_cards_on_board, false);
            ///////
            
            for(var i=0; i<2; i++) {
                var card_nodes = i == 0 ? this.selectCardsInHand() : (all_cards_on_board ? this.selectAllCardsOnBoard() : this.selectActiveCardsOnBoard());
                var self = this;
                card_nodes.forEach(function(node) {
                    var HTML_id = dojo.attr(node, "id");
                    self.removeTooltip(HTML_id)
                });
            }
        },
        
        destroyAllMyBoardTooltips : function() {
            var card_nodes = this.selectAllCardsOnBoard();
            var self = this;
            card_nodes.forEach(function(node) {
                var HTML_id = dojo.attr(node, "id");
                self.removeTooltip(HTML_id)
            });
        },
        
        destroyMyBoardTooltipsOfColors : function(colors) {
            var card_nodes = this.selectCardsOnMyBoardOfColors(colors);
            var self = this;
            card_nodes.forEach(function(node) {
                var HTML_id = dojo.attr(node, "id");
                self.removeTooltip(HTML_id)
            });
        },
        
        createMyHandAndBoardTooltipsWithActions : function() {
            for(var i=0; i<2; i++) {
                var card_nodes = i == 0 ? this.selectCardsInHand() : this.selectActiveCardsOnBoard();
                var self = this;
                card_nodes.forEach(function(node) {
                    var HTML_id = dojo.attr(node, "id");
                    var id = self.getCardIdFromHTMLId(HTML_id);
                    var HTML_help = self.saved_HTML_cards[id]; // Get the saved HTML code for the L card
                    var card = self.saved_cards[id];
                    if (i == 0) {
                        var HTML_action = self.createActionTextForCardInHand(card);
                    }
                    else {
                        var HTML_action = self.createActionTextForActiveCard(card);
                    }
                    self.addCustomTooltip(HTML_id, HTML_help, HTML_action);
                });
            }
        },
        
        createMyHandAndBoardTooltipsWithoutActions : function(all_cards_on_board) {
            // Default values
            all_cards_on_board = this.setDefault(all_cards_on_board, false);
            ///////
            
            var selectors = [this.selectCardsInHand, this.selectActiveCardsOnBoard]
            for(var i=0; i<2; i++) {
                var card_nodes = i == 0 ? this.selectCardsInHand() : (all_cards_on_board ? this.selectAllCardsOnBoard() : this.selectActiveCardsOnBoard());
                var self = this;
                card_nodes.forEach(function(node) {
                    var HTML_id = dojo.attr(node, "id");
                    var id = self.getCardIdFromHTMLId(HTML_id);
                    var HTML_help = self.saved_HTML_cards[id]; // Get the saved HTML code for the L card
                    self.addCustomTooltip(HTML_id, HTML_help, "");
                });
            }
        },
        
        createMyBoardTooltipsForColorsWithSplayingActions : function(colors, colors_in_clear, splay_direction, splay_direction_in_clear) {
            var card_nodes = this.selectCardsOnMyBoardOfColors(colors);
            var self = this;
            card_nodes.forEach(function(node) {
                var HTML_id = dojo.attr(node, "id");
                var id = self.getCardIdFromHTMLId(HTML_id);
                var HTML_help = self.saved_HTML_cards[id]; // Get the saved HTML code for the L card
                var card = self.saved_cards[id];
                
                // Search for the name of the color in clear
                for (var i=0; i<colors.length; i++) {
                    if (colors[i] = card.color) {
                        var color_in_clear = colors_in_clear[i];
                        break;
                    }
                }
                
                HTML_action = self.createActionTextForCardInSplayablePile(card, color_in_clear, splay_direction, splay_direction_in_clear);
                self.addCustomTooltip(HTML_id, HTML_help, HTML_action);
            });
        },
        
        createAllMyBoardTooltipsWithoutActions : function() {
            var card_nodes = this.selectAllCardsOnBoard();
            var self = this;
            card_nodes.forEach(function(node) {
                var HTML_id = dojo.attr(node, "id");
                var id = self.getCardIdFromHTMLId(HTML_id);
                var HTML_help = self.saved_HTML_cards[id]; // Get the saved HTML code for the L card
                self.addCustomTooltip(HTML_id, HTML_help, "");
            });
        },
        
        createActionTextForCardInHand : function(card) {
            HTML_action = "<p class='possible_action'>" + _("Click to meld this card.") + "<p>";
            // See if melding this card would cover another one
            var pile = this.zone.board[this.player_id][card.color].items;
            var covered_card = pile.length > 0;
            if (covered_card) {
                var top_card = pile[pile.length - 1];
                var top_card_id = this.getCardIdFromHTMLId(top_card.id);
                var top_card = this.saved_cards[top_card_id];
                HTML_action += dojo.string.substitute("<p>" + _("If you do, it will cover ${age} ${card_name} and your new ressource counts will be:") + "<p>",
                    {
                        'age': this.square('N', 'age', top_card.age, 'in_log'),
                        'card_name': "<span class='card_name'>" + _(top_card.name) + "</span>"
                    });
            }
            else {
                HTML_action += "<p>" + _("If you do, your new ressource counts will be:") + "</p>";
            }
            
            // Calculate new ressource count if this card is melded
            // Get current ressouce count
            var current_ressource_counts = {};
            var new_ressource_counts = {};
            for(var icon=1; icon<=6; icon++) {
                current_count = this.counter.ressource_count[this.player_id][icon].getValue();
                current_ressource_counts[icon] = current_count;
                new_ressource_counts[icon] = current_count;
            }
            
            // Add ressources brought by the new card
            new_ressource_counts[card.spot_1]++
            new_ressource_counts[card.spot_2]++
            new_ressource_counts[card.spot_3]++
            new_ressource_counts[card.spot_4]++
            
            if (covered_card) { // Substract the ressources no longer visible
                var splay_indicator = 'splay_indicator_' + this.player_id + '_' + top_card.color;
                for (var direction=0; direction<=3; direction++) {
                    if (dojo.hasClass(splay_indicator, 'splay_' + direction)) {
                        var splay_direction = direction;
                        break;
                    }
                }
                
                switch(parseInt(splay_direction)) {
                case 0: // All icons of the old top card are lost
                    new_ressource_counts[top_card.spot_1]--
                    new_ressource_counts[top_card.spot_2]--
                    new_ressource_counts[top_card.spot_3]--
                    new_ressource_counts[top_card.spot_4]--
                    break;
                case 1: // Only the icon on bottom right can still be seen (spot_4)
                    new_ressource_counts[top_card.spot_1]--
                    new_ressource_counts[top_card.spot_2]--
                    new_ressource_counts[top_card.spot_3]--
                    break;
                case 2: // Icons on left can still be seen (spot_1 and spot_2)
                    new_ressource_counts[top_card.spot_3]--
                    new_ressource_counts[top_card.spot_4]--
                    break;
                case 3: // Icons on bottom can still be seen (spot_2, spot_3 and spot_4)
                    new_ressource_counts[top_card.spot_1]--
                    break;
                }
            }

            HTML_action += this.createSimulatedRessourceTable(current_ressource_counts, new_ressource_counts);
            
            return HTML_action;
        },
        
        createActionTextForActiveCard : function(card) {
            var player_total = this.counter.ressource_count[this.player_id][card.dogma_icon].getValue();
            
            var weaker_players = [];
            var stronger_or_equal_players = [];
            for (var p=2; p<=Object.keys(this.players).length; p++) {
                var player_panel = dojo.query(".player:nth-of-type(" + p + ")")[0];
                var player_id = dojo.attr(player_panel, 'id').substr(7); // Get players in sorted order relatively to me
                if (this.counter.ressource_count[player_id][card.dogma_icon].getValue() < player_total) {
                    weaker_players.push(player_id);
                }
                else {
                    stronger_or_equal_players.push(player_id);
                }
            }
            
            exists_i_demand_effect = card.i_demand_effect_1 !== null;
            exists_non_demand_effect = card.non_demand_effect_1 != null;
            exist_several_non_demand_effects = card.non_demand_effect_2 != null;
            
            several_effects = (exists_i_demand_effect && exists_non_demand_effect) || exist_several_non_demand_effects;
            
            if (exists_i_demand_effect && !exists_non_demand_effect && weaker_players.length == 0) {
                HTML_action = "<p class='warning'>" + dojo.string.substitute(_('Activating this card will have no effect, since it has only an "I demand" effect and nobody has less ${icon} than you.'), {'icon': this.square('N', 'icon', card.dogma_icon, 'in_log')}) + "</p>";
            }
            else {
                HTML_action = "<p class='possible_action'>" + (several_effects ? _("Click to execute the dogma effects of this card.") : _("Click to execute the dogma effect of this card.")) + "</p>";
                HTML_action += "<p>" + _("If you do:") + "</p>"
                HTML_action += "<ul class='recap_dogma'>"
                
                if (exists_i_demand_effect) {
                    if (weaker_players.length == 0) {
                        HTML_action += "<li>" + _("Nobody will execute the I demand effect.") + "</li>"
                    }
                    else {
                        var players = [];
                        for(var p=0; p<weaker_players.length; p++) {
                            var player_id = weaker_players[p];
                            var player = $('name_' + player_id).outerHTML.replace("<p", "<span class='name_in_tooltip'").replace("</p", "</span");
                            players.push(player);
                        }
                        if (players.length == 1) {
                            HTML_action += "<li>" + dojo.string.substitute(_("${player} will execute the I demand effect."), {'player': players[0]}) + "</li>"
                        }
                        else {
                            HTML_action += "<li>" + dojo.string.substitute(_("${players} will execute the I demand effect."), {'players': players.join(', ')}) + "</li>"
                        }
                    }
                }
                
                if (exists_non_demand_effect) {
                    if (stronger_or_equal_players.length == 0) {
                        if (!exist_several_non_demand_effects) {
                            HTML_action += "<li>" + _("You will execute the non-demand effect alone.") + "</li>"
                        }
                        else {
                            HTML_action += "<li>" + _("You will execute the non-demand effects alone.") + "</li>"
                        }
                    }
                    else {
                        var players = [];
                        for(var p=0; p<stronger_or_equal_players.length; p++) {
                            var player_id = stronger_or_equal_players[p];
                            var player = $('name_' + player_id).outerHTML.replace("<p", "<span class='name_in_tooltip'").replace("</p", "</span");
                            players.push(player);
                        }
                        if (players.length == 1) {
                            if (!exist_several_non_demand_effects) {
                                HTML_action += "<li>" + dojo.string.substitute(_("${player} will share the non-demand effect before you execute it."), {'player': players[0]}) + "</li>";
                            }
                            else {
                                HTML_action += "<li>" + dojo.string.substitute(_("${player} will share each non-demand effect before you execute it."), {'player': players[0]}) + "</li>";
                            }
                        }
                        else {
                            if (!exist_several_non_demand_effects) {
                                HTML_action += "<li>" + dojo.string.substitute(_("${players} will share the non-demand effect before you execute it."), {'players': players.join(', ')}) + "</li>"
                            }
                            else {
                                HTML_action += "<li>" + dojo.string.substitute(_("${players} will share each non-demand effect before you execute it."), {'players': players.join(', ')}) + "</li>"
                            }
                        }
                    }
                }
                HTML_action += "</ul>";
            }

            return HTML_action;
        },
        
        createActionTextForCardInSplayablePile : function(card, color_in_clear, splay_direction, splay_direction_in_clear) {
            HTML_action = "<p class='possible_action'>" + dojo.string.substitute(_("Click to splay your ${color} pile ${direction}."), {'color': color_in_clear, 'direction': splay_direction_in_clear}) + "<p>";
            HTML_action += "<p>" + _("If you do, your new ressource counts will be:") + "</p>";

            var pile = this.zone.board[this.player_id][card.color].items;
            
            var splay_indicator = 'splay_indicator_' + this.player_id + '_' + card.color;
            for (var direction=0; direction<=3; direction++) {
                if (dojo.hasClass(splay_indicator, 'splay_' + direction)) {
                    var current_splay_direction = direction;
                    break;
                }
            }
            
            // Calculate new ressource count if the splay direction changes
            // Get current ressouce count
            var current_ressource_counts = {};
            var new_ressource_counts = {};
            for(var icon=1; icon<=6; icon++) {
                current_count = this.counter.ressource_count[this.player_id][icon].getValue();
                current_ressource_counts[icon] = current_count;
                new_ressource_counts[icon] = current_count;
            }
            
            // Browse all the cards of the pîle except the one on top
            for (var i=0; i<pile.length-1; i++) {
                var pile_card = pile[i];
                var pile_card_id = this.getCardIdFromHTMLId(pile_card.id);
                var pile_card = this.saved_cards[pile_card_id];
                
                // Remove ressources brought by the current splay
                switch(parseInt(current_splay_direction)) {
                case 0: // Not currently splayed: no lost
                    break;
                case 1: // Only the icon on bottom right can be seen (spot_4)
                    new_ressource_counts[pile_card.spot_4]--
                    break;
                case 2: // Icons on left can be seen (spot_1 and spot_2)
                    new_ressource_counts[pile_card.spot_1]--
                    new_ressource_counts[pile_card.spot_2]--
                    break;
                case 3: // Icons on bottom can be seen (spot_2, spot_3 and spot_4)
                    new_ressource_counts[pile_card.spot_2]--
                    new_ressource_counts[pile_card.spot_3]--
                    new_ressource_counts[pile_card.spot_4]--
                    break;
                }
                
                // Add ressources granted by the new splay
                switch(parseInt(splay_direction)) {
                case 0: // Not splayed (this should not happen)
                    break;
                case 1: // Only the icon on bottom right will be revealed (spot_4)
                    new_ressource_counts[pile_card.spot_4]++
                    break;
                case 2: // Icons on left will be revealed (spot_1 and spot_2)
                    new_ressource_counts[pile_card.spot_1]++
                    new_ressource_counts[pile_card.spot_2]++
                    break;
                case 3: // Icons on bottom will be revealed (spot_2, spot_3 and spot_4)
                    new_ressource_counts[pile_card.spot_2]++
                    new_ressource_counts[pile_card.spot_3]++
                    new_ressource_counts[pile_card.spot_4]++
                    break;
                }
            }
            
            HTML_action += this.createSimulatedRessourceTable(current_ressource_counts, new_ressource_counts);
        
            return HTML_action;
        },
        
        createSimulatedRessourceTable : function(current_ressource_counts, new_ressource_counts) {
            var table = dojo.create('table', { 'class': 'ressource_table' });
            var symbol_line = dojo.create('tr', null, table);
            var count_line = dojo.create('tr', null, table);
            
            for(var icon=1; icon<=6; icon++) {
                var current_count = current_ressource_counts[icon];
                var new_count = new_ressource_counts[icon];
                var comparator = new_count == current_count ? 'equal' : (new_count > current_count ? 'more' : 'less');
                dojo.place('<td><div class="ressource with_white_border ressource_' + icon + ' square P icon_' + icon + '"></div></td>', symbol_line);
                dojo.place('<td><div class="ressource with_white_border' + icon + ' ' + comparator + '">&nbsp;&#8239;' + new_count + '</div></td>', count_line);
            }
            return table.outerHTML;
        },
        
        /*
         * Selectors for connect event, usable to use with this.on, this.off functions and .addClass and .removeClass methods
         */
        selectAllCards : function() {
            return dojo.query(".card, .recto");
        },
        
        selectCardsInHand : function() {
            return dojo.query("#hand_" + this.player_id + " > .card");
        },
        
        selectAllCardsOnBoard : function() {
            return dojo.query("#board_" + this.player_id + " .card");
        },
        
        selectCardsOnMyBoardOfColors : function(colors) {
            var queries = []
            for(var i=0; i<colors.length; i++) {
                var color = colors[i];
                queries.push("#board_" + this.player_id + "_" + color +  " .card")
            }
            return dojo.query(queries.join(","));
        },
        
        selectActiveCardsOnBoard : function() {
            var player_board = this.zone.board[this.player_id];
            var selectable_list = [];
            for (var color=0; color<5; color++) {
                var pile = player_board[color].items;
                if (pile.length == 0) {
                    continue;
                }
                var top_card = pile[pile.length - 1];
                selectable_list.push("#" + top_card.id);
            }
            return selectable_list.length > 0 ? dojo.query(selectable_list.join(",")) : new dojo.NodeList();
        },
        
        selectClaimableAchievements : function(claimable_ages) {
            identifiers = [];
            for (var i=0; i<claimable_ages.length; i++) {
                var age = claimable_ages[i];
                identifiers.push("#achievements > .age_" + age);
            }
            return dojo.query(identifiers.join(","));
        },
        
        selectDrawableCard : function(age_to_draw) {
            var deck_to_draw_in = this.zone.deck[age_to_draw].items;
            var top_card = deck_to_draw_in[deck_to_draw_in.length - 1];
            return dojo.query("#" + top_card.id);
        },
        
        selectCardsFromList : function(cards) {
            if (cards.length == 0) {
                return null;
            }
            var identifiers = [];
            for (var i=0; i<cards.length; i++) {
                var card = cards[i];
                identifiers.push("#" + this.getCardHTMLId(card.id, card.age, "M card"));
            }
            return dojo.query(identifiers.join(","));
        },
        
        selectRectosFromList : function(recto_positional_infos_array) {
            if (recto_positional_infos_array.length == 0) {
                return null;
            }
            var identifiers = [];
            for (var i=0; i<recto_positional_infos_array.length; i++) {
                var card = recto_positional_infos_array[i];
                var zone = this.getZone(card['location'], card.owner, card.age);
                var id = this.getCardIdFromPosition(zone, card.position, card.age)
                identifiers.push("#" + this.getCardHTMLId(id, card.age, zone.HTML_class));
            }
            return dojo.query(identifiers.join(","));
        },
        
        /*
         * Deactivate all click events
         */
        deactivateClickEvents : function() {
            this.deactivated_cards = dojo.query(".clickable");
            this.deactivated_cards.removeClass("clickable");
            
            this.deactivated_cards_important = dojo.query(".clickable_important");
            this.deactivated_cards_important.removeClass("clickable_important");
            
            this.off(this.deactivated_cards, 'onclick');

            this.erased_pagemaintitle_text = $('pagemaintitletext').innerHTML;
            
            dojo.query('#generalactions > .action-button, #extra_text').addClass('hidden'); // Hide buttons
            $('pagemaintitletext').innerHTML = _("Move recorded. Waiting for update...");

        },
        
        resurrectClickEvents : function(revert_text) {
            this.deactivated_cards.addClass("clickable");
            this.deactivated_cards_important.addClass("clickable_important");
            
            this.restart(this.deactivated_cards, 'onclick');
            
            dojo.query('#generalactions > .action-button, #extra_text').removeClass('hidden'); // Show buttons again
            if (revert_text) {
                $('pagemaintitletext').innerHTML = this.erased_pagemaintitle_text;
            }
        },
        
        /*
         * Getters: no change on the interface
         */
        getCardSizeInZone : function(zone_HTML_class) {
            return zone_HTML_class.split(' ')[0];
        },
        
        getCardTypeInZone : function(zone_HTML_class) {
            return zone_HTML_class.split(' ')[1];
        },
        
        getZone : function(location, owner, age, color) {
            // Default values
            age = this.setDefault(age, null);
            color = this.setDefault(color, null);
            ///////
            
            var root = this.zone[location];
            switch(location) {
                case "deck":
                    return root[age];
                case "hand":
                case "score":
                case "revealed":
                case "achievements":
                    if (owner == 0 && age === null) {
                        return this.zone.special_achievements[0];
                    }
                    else {
                        return root[owner];
                    }
                case "board":
                    return root[owner][color];
            }
        },
        
        getCardAgeFromId : function(id) {
            id = parseInt(id);
            if (id < 0) {
                return null;
            }
            if (id < 105) {
                // visible card
                if (id < 15) {
                    return 1;
                }
                return parseInt((id + 5) / 10);
            }
            if (id < this.system_offset) {
                return null
            }
            // id >= this.system_offset => recto of the card
            return id % 20;
        },
        
        getCardIdFromPosition : function(zone, position, age) {
            if (!zone.grouped_by_age) {
                return this.getCardIdFromHTMLId(zone.items[position].id);
            }
            var p = 0;
            for (var i=0; i<zone.items.length; i++) {
                var item = zone.items[i];
                
                if (this.getCardAgeFromHTMLId(item.id) != age) {
                    continue;
                }
                if (p == position) {
                    return this.getCardIdFromHTMLId(item.id);
                }
                p++;
            }
        },
        
        getCardPositionFromId : function(zone, id, age) {
            if (!zone.grouped_by_age) {
                for(var p=0; p<zone.items.length; p++) {
                    var item = zone.items[p];
                    if (this.getCardIdFromHTMLId(item.id) == id) {
                        return p;
                    }
                }
            }
            var p = 0;
            for (var i=0; i<zone.items.length; i++) {
                var item = zone.items[i];
                
                if (this.getCardAgeFromHTMLId(item.id) != age) {
                    continue;
                }
                if (this.getCardIdFromHTMLId(item.id) == id) {
                    return p;
                }
                p++;
            }
        },
        
        getCardHTMLIdFromEvent : function(event) {
            return dojo.getAttr(event.currentTarget, 'id');
        },
        
        getCardHTMLId : function(id, age, zone_HTML_class) {
            return ["item_" + id, "age_" + age, zone_HTML_class.replace(" ", "__")].join("__");
        },
        
        getCardHTMLClass : function(id, age, zone_HTML_class) {
            return ["item_" + id, "age_" + age, zone_HTML_class].join(" ");
        },
        
        getCardIdFromHTMLId : function(HTML_id) {
            return parseInt(HTML_id.split("__")[0].substr(5));
        },
        
        getCardAgeFromHTMLId : function(HTML_id) {
            return parseInt(HTML_id.split("__")[1].substr(4));
        },
        
        /*
         * Card creation
         */
        createCard : function(id, age, zone_HTML_class, card) {
            var HTML_id = this.getCardHTMLId(id, age, zone_HTML_class);
            var HTML_class = this.getCardHTMLClass(id, age, zone_HTML_class);
            var size = this.getCardSizeInZone(zone_HTML_class);
            
            if (card === null ) {
                var HTML_inside = size == 'L' ? this.writeOverRecto(age) : '';
            }
            else if (card.age === null) {
                var HTML_inside =  this.writeOverSpecialAchievement(card, size, id == 106);
            }
            else {
                var HTML_inside = this.writeOverCard(card, size);
            }
            
            return "<div id='" + HTML_id + "' class='" + HTML_class + "'>" + HTML_inside + "</div>";
        },
        
        writeOverCard : function(card, size) {
            var title = _(card.name).toUpperCase();
            var div_title = this.createAdjustedContent(title, 'card_title', size, size == 'M' ? 11 : 30, 3);
            
            var i_demand_effect_1 = card.i_demand_effect_1 !== null ? this.createDogmaEffectText(_(card.i_demand_effect_1), card.dogma_icon, size, 'i_demand_effect_1')  : "";

            var non_demand_effect_1 = card.non_demand_effect_1 !== null ? this.createDogmaEffectText(_(card.non_demand_effect_1) , card.dogma_icon, size, 'non_demand_effect_1')  : "";
            var non_demand_effect_2 = card.non_demand_effect_2 !== null ? this.createDogmaEffectText(_(card.non_demand_effect_2) , card.dogma_icon, size, 'non_demand_effect_2')  : "";
            var non_demand_effect_3 = card.non_demand_effect_3 !== null ? this.createDogmaEffectText(_(card.non_demand_effect_3) , card.dogma_icon, size, 'non_demand_effect_3')  : "";
            
            var div_effects = this.createAdjustedContent(i_demand_effect_1 + non_demand_effect_1 + non_demand_effect_2 + non_demand_effect_3, "card_effects color_" + card.color, size, size == 'M' ? 8 : 17);
            
            return div_title + div_effects;            
        },
        
        writeOverRecto : function(age) {
            return this.createAdjustedContent(this.normal_achievement_names[age].toUpperCase(), 'normal_achievement_title', '', 25);
        },
        
        writeOverSpecialAchievement : function(card, size, is_monument) {
            var note_for_monument = _("Note: Transfered cards from other players do not count toward this achievement, nor does exchanging cards from your hand and score pile.")
            
            var achievement_name = _(card.achievement_name).toUpperCase();
            var div_achievement_name = this.createAdjustedContent(achievement_name, 'achievement_title', '', 30);
            
            var condition_for_claiming = this.parseForRichedText(_(card.condition_for_claiming), size) + (is_monument ? "<div id='note_for_monument'>" + note_for_monument + "</div>" : '');
            var div_condition_for_claiming = this.createAdjustedContent(condition_for_claiming, 'condition_for_claiming', '', 25);
            
            var alternative_condition_for_claiming = _(card.alternative_condition_for_claiming);
            var div_alternative_condition_for_claiming = this.createAdjustedContent(alternative_condition_for_claiming, 'alternative_condition_for_claiming', '', 20);
            
            return div_achievement_name + div_condition_for_claiming + div_alternative_condition_for_claiming;            
        },
        
        /*
         * Zone management systemcard
         */
        createZone : function(location, owner, age_or_color, grouped_by_age, counter_method, counter_display_zero) {
            // Default values
            age_or_color = this.setDefault(age_or_color, null);
            grouped_by_age = this.setDefault(grouped_by_age, null);
            counter_method = this.setDefault(counter_method, null);
            counter_display_zero = this.setDefault(counter_display_zero, null);
            ///////
        
            // Dimension of a card in the zone
            var HTML_class;
            
            var new_location;
            if(location == "hand") {
                if (owner == this.player_id) {
                    new_location = 'my_hand';
                }
                else {
                    new_location = 'opponent_hand';
                }
            }
            else {
                new_location = location;
            }

            var HTML_class = this.HTML_class[new_location]
            var card_dimensions = this.card_dimensions[HTML_class]
            
            // Width of the zone
            var zone_width;
            if(new_location == 'board') {
                zone_width = card_dimensions.width; // Will change dynamically if splayed left or right
            }
            else if (new_location == 'score') {
                zone_width = dojo.position('score_container_' + owner).w;
            }
            else if (new_location != 'achievements' && new_location != 'special_achievements') {
                var delta_x = this.delta[new_location].x
                var n = this.nb_cards_in_row[new_location];
                zone_width = card_dimensions.width + (n - 1) * delta_x;
            }
            
            // Id of the container
            if (location == "my_score_verso") {
                var div_id = location;
            }
            else {
                var div_id = location + (owner != 0 ? '_' + owner : '') + (age_or_color !== null ? '_' + age_or_color : '');
            }
            
            // Creation of the zone
            dojo.style(div_id, 'width', zone_width + 'px');
            dojo.style(div_id, 'height', card_dimensions.height + 'px');
            var zone =  new ebg.zone();
            zone.create(this, div_id, card_dimensions.width, card_dimensions.height);
            zone.setPattern('grid');
            
            // Add information which identify the zone
            zone['location'] = new_location;
            zone.owner = owner;
            zone.HTML_class = HTML_class;
            zone.grouped_by_age = grouped_by_age;
            
            if (counter_method != null) {
                var counter_node = $(location + '_count'  + (owner != 0 ? '_' + owner : '') + (age_or_color !== null ? '_' + age_or_color : ''));
                zone.counter = new ebg.counter()
                zone.counter.create(counter_node);
                zone.counter.setValue(0);
                if(!counter_display_zero) {
                    dojo.style(zone.counter.span, 'visibility', 'hidden');
                }
                zone.counter.method = counter_method;
                zone.counter.display_zero = counter_display_zero;
            }
            else {
                zone.counter = null;
            }
            
            return zone;
        },
        

        createAndAddToZone: function(zone, position, age, id, start, card) {
            // id of the new item
            var visible_card
            if (id === null) {
                // Recto
                visible_card = false;
                
                // The id is to be created
                id = this.uniqueIdForCard(age); // Create a new id based on the age of the card
            }
            else {
                // verso
                if (zone.owner != 0 && zone['location'] == 'achievements') {
                    visible_card = false;
                }
                else {
                    visible_card = true;
                }
            }
            var HTML_id = this.getCardHTMLId(id, age, zone.HTML_class);
            var HTML_class = this.getCardHTMLClass(id, age, zone.HTML_class);
            
            // Create a new card and place it on start position
            var node = this.createCard(id, age, zone.HTML_class, visible_card ? card : null);
            dojo.place(node, start);
            
            this.addToZone(zone, id, position, age);
        },
        
        moveBetweenZones: function(zone_from, zone_to, id_from, id_to, card) {
            if (id_from == id_to && card.age !== null) {
                this.addToZone(zone_to, id_to, card.position_to, card.age);
                this.removeFromZone(zone_from, id_from, false, card.age);
            }
            else {
                this.createAndAddToZone(zone_to, card.position_to, card.age, id_to, this.getCardHTMLId(id_from, card.age, zone_from.HTML_class), card);
                this.removeFromZone(zone_from, id_from, true, card.age);
            }
        },
        
        addToZone: function(zone, id, position, age)
        {
            var HTML_id = this.getCardHTMLId(id, age, zone.HTML_class);
            dojo.style(HTML_id, 'position', 'absolute')
            
            if (zone['location'] == 'revealed' && zone.items.length == 0) {
                dojo.style(zone.container_div, 'display', 'block');
            }
       
            var grouped_by_age = zone['location'] != 'board' && zone['location'] != 'achievements';
            
            // Update weights before adding and find the right spot to put the card according to its position, and age for not board stock
            var found = false;
            var p = 0;
            for (var i=0; i<zone.items.length; i++) {
                var item = zone.items[i];
                
                if (grouped_by_age && this.getCardAgeFromHTMLId(item.id) < age) { // We have not reached the group the card can be put into
                    continue;
                }
                
                if (!found && grouped_by_age && this.getCardAgeFromHTMLId(item.id) > age || // Cards are grouped by age, and there is no card with the same age as the card to be inserted
                    p == position // The position in the group has been found
                   ) { // This is the spot the card must be placed
                    var weight = i;
                    found = true;
                }
                
                if (found) { // Increment positions of the cards after
                    item.weight++;
                    dojo.style(item.id, 'z-index', item.weight)
                }
                p++;
            }
            if (!found) { // No spot for the card has been found after running all the stock
                // The card must be placed on last position
                var weight = zone.items.length;
            }
            
            // Add the card
            dojo.style(HTML_id, 'z-index', weight)
            zone.placeInZone(HTML_id, weight);
            
            if(zone['location'] == 'board' && (zone.splay_direction == 1 /* left */ || zone.splay_direction == 2 /* right */)) { 
                this.updateZoneWidth(zone);
            }
            zone.updateDisplay();
            
            // Update count if applicable
            if (zone.counter !== null) {
                // Update the value in the associated counter
                var delta;
                switch(zone.counter.method) {
                case("COUNT"):
                    delta = 1;
                    break;
                case("SUM"):
                    delta = parseInt(age);
                    break;
                }
                zone.counter.incValue(delta);
                if(!zone.counter.display_zero) {
                    dojo.style(zone.counter.span, 'visibility', zone.counter.getValue() == 0 ? 'hidden' : 'visible');
                }
            }
        },
        
        removeFromZone: function(zone, id, destroy, age)
        {
            var HTML_id = this.getCardHTMLId(id, age, zone.HTML_class);
            
            // Update weights before removing
            var found = false;
            for (var i=0; i<zone.items.length; i++) {
                var item = zone.items[i];
                if (found) {
                    item.weight--;
                    dojo.style(item.id, 'z-index', item.weight);
                    continue;
                }
                if (item.id == HTML_id) {
                    found = true;
                }
            }
            
            // Remove the card
            zone.removeFromZone(HTML_id, destroy);
            
            // Remove the space occupied by the card if needed
            if(zone['location'] == 'board' && (zone.splay_direction == 1 /* left */ || zone.splay_direction == 2 /* right */)) { 
                this.updateZoneWidth(zone);
            }
            else if (zone['location'] == 'revealed' && zone.items.length == 0) {
                zone = this.createZone('revealed', zone.owner, null, grouped_by_age=false); // Recreate the zone (Dunno why it does not work if I don't do that)
                dojo.style(zone.container_div, 'display', 'none');
            }
            zone.updateDisplay();
            
            // Update count if applicable
            if (zone.counter !== null) {
                // Update the value in the associated counter
                var delta;
                switch(zone.counter.method) {
                case("COUNT"):
                    delta = -1;
                    break;
                case("SUM"):
                    delta = parseInt(-age);
                    break;
                }
                zone.counter.incValue(delta);
                if(!zone.counter.display_zero) {
                    dojo.style(zone.counter.span, 'visibility', zone.counter.getValue() == 0 ? 'hidden' : 'visible');
                }
            }
        },
        
        shrinkZoneForNoneOrUpSplay : function(zone) {
            width = this.card_dimensions[zone.HTML_class].width
            width += 'px';
            dojo.setStyle(zone.container_div, 'width', width);
        },
        
        updateZoneWidth : function(zone) {
            width = this.card_dimensions[zone.HTML_class].width + (zone.items.length - 1) * this.overlap_for_splay[zone.HTML_class][this.display_mode ? "expanded" : "compact"];
            width += 'px';
            dojo.setStyle(zone.container_div, 'width', width);
        },
        
        setPlacementRules : function(zone, left_to_right) {
            var self = this;
            
            zone.itemIdToCoordsGrid = function(i, control_width) {                
                var w = self.card_dimensions[this.HTML_class].width;
                var h = self.card_dimensions[this.HTML_class].height;
                
                var delta = self.delta[this['location']];
                var n = self.nb_cards_in_row[this['location']];
                
                if (left_to_right) {
                    var x_beginning = 0;
                    var delta_x = delta.x;
                }
                else {
                    var x_beginning = control_width - w;
                    var delta_x = -delta.x;
                }
                
                var delta_y = delta.y;
                var n_x = i % n;
                var n_y = parseInt(i/n);
                
                return {'x':x_beginning + delta_x * n_x, 'y': delta_y * n_y, 'w':w, 'h':h}
            }
        },
        
        setPlacementRulesForAchievements : function() {
            var self = this;
            var zone = this.zone.achievements["0"];
            
            zone.itemIdToCoordsGrid = function(i, control_width) {                
                var w = self.card_dimensions[this.HTML_class].width;
                var h = self.card_dimensions[this.HTML_class].height;
                
                var x = parseInt(i / 3) * (w + 10)
                var y = (i %3 ) * (h + 5) 
                
                return {'x':x, 'y':y, 'w':w, 'h':h}
            }
        },
        
        setPlacementRulesForSpecialAchievements : function() {
            var self = this;
            var zone = this.zone.special_achievements["0"];
            
            zone.itemIdToCoordsGrid = function(i, control_width) {                
                var w = self.card_dimensions[this.HTML_class].width;
                var h = self.card_dimensions[this.HTML_class].height;
                
                var x = i * (w / 2 + 5)
                var y = (i % 2) * (h + 5)
                
                return {'x':x, 'y':y, 'w':w, 'h':h}
            }
        },
        
        setSplayMode : function(zone, splay_direction, force_full_visible) {
            // Default values
            force_full_visible = this.setDefault(full_visible, null);
            ///////
            
            var full_visible = force_full_visible || this.view_full;
            zone.splay_direction = splay_direction;
            if (splay_direction == 0 || splay_direction == 3 || full_visible) {
                // New width = width of a single card
                this.shrinkZoneForNoneOrUpSplay(zone);
            }
            else {
                // New width = width of a single card + (n - 1) * offset
                this.updateZoneWidth(zone);
            }
            var self = this;
            zone.itemIdToCoordsGrid = function(i, control_width) {
                var w = self.card_dimensions[this.HTML_class].width;
                var h = self.card_dimensions[this.HTML_class].height;
                var overlap = self.overlap_for_splay[this.HTML_class][self.display_mode ? "expanded" : "compact"];
                if (full_visible) {
                    var x_beginning = 0;
                    var delta_x = 0;
                    var delta_y = h + 5;
                }
                else {
                    switch(parseInt(splay_direction)) {
                    case 0: // Unsplayed
                        var x_beginning = 0;
                        var delta_x = 0;
                        var delta_y = self.overlap_for_unsplayed;
                        break;
                    case 1: // Splayed left
                        var x_beginning = control_width - w;
                        var delta_x = -overlap;
                        var delta_y = 0;
                        break;
                    case 2: // Splayed right
                        var x_beginning = 0;
                        var delta_x = overlap;
                        var delta_y = 0;
                        break;
                    case 3: // Splayed up
                        var x_beginning = 0;
                        var delta_x = 0;
                        var delta_y = overlap;
                        break;
                    default:
                        break;
                    }
                }
                return {'x':x_beginning + delta_x * i, 'y':delta_y * (full_visible || splay_direction == 3 ? this.items.length - 1 - i : i), 'w':w, 'h':h}
            }

            zone.updateDisplay();
        },
        
        /*
         * Player panel management
         */
        givePlayerActionCard : function(player_id, action_number) {
            dojo.addClass('action_indicator_' + player_id, 'action_' + action_number);
            var action_text = action_number == 1 ? _('First action') : _('Second action');
            var div_action_text = this.createAdjustedContent(action_text, 'action_text', '', 15, 2);
            $('action_indicator_' + player_id).innerHTML = div_action_text;
        },
        
        destroyActionCard : function() {
            var action_indicators = dojo.query('.action_indicator');
            action_indicators.forEach(function(node) {
                node.innerHTML = "";
            });
            for(var i=1; i<=2; i++) {
                action_indicators.removeClass('action_' + i);
            }
        },
        
        ///////////////////////////////////////////////////
        //// Player's action
        
        /*
        
            Here, you are defining methods to handle player's action (ex: results of mouse click on 
            game objects).
            
            Most of the time, these methods:
            _ check the action is possible at this game state.
            _ make a call to the game server
        
        */
        
        action_clicForInitialMeld : function(event) {
            if(!this.checkAction('initialMeld')){
                return;
            }
            this.deactivateClickEvents();
            
            // Reset tooltips for hand or board
            this.destroyMyHandAndBoardTooltips(true);
            this.createMyHandAndBoardTooltipsWithoutActions(true);
            
            var HTML_id = this.getCardHTMLIdFromEvent(event);
            var card_id = this.getCardIdFromHTMLId(HTML_id);
            dojo.addClass(HTML_id, "selected");

            var cards_in_hand = this.selectCardsInHand();
            this.off(cards_in_hand, 'onclick');
            this.on(cards_in_hand, 'onclick', 'action_clickForUpdatedInitialMeld');
            
            var self = this;
            this.ajaxcall("/innovation/innovation/initialMeld.html",
                            {
                                lock: true,
                                card_id: card_id
                            },
                             this, function(result){}, function(is_error){this.resurrectClickEvents(is_error);}
                        );
        },
    
        action_clickForUpdatedInitialMeld : function(event) {
            this.deactivateClickEvents();

            // Reset tooltips for hand or board
            this.destroyMyHandAndBoardTooltips(true);
            this.createMyHandAndBoardTooltipsWithoutActions(true);
            
            dojo.query(".selected").removeClass("selected");
            var HTML_id = this.getCardHTMLIdFromEvent(event);
            var card_id = this.getCardIdFromHTMLId(HTML_id);
            dojo.addClass(HTML_id, "selected");
            
            var self = this;
            this.ajaxcall("/innovation/innovation/updateInitialMeld.html",
                            {
                                lock: true,
                                card_id: card_id
                            },
                             this, function(result){}, function(is_error){this.resurrectClickEvents(is_error);}
                        );
        },
        
        action_clicForAchieve : function(event) {
            if(!this.checkAction('achieve')){
                return;
            }
            this.deactivateClickEvents();
            
            var HTML_id = this.getCardHTMLIdFromEvent(event);
            if (HTML_id.substr(0, 4) == "item") { // The achievement card itself has been clicked
                var age = this.getCardAgeFromHTMLId(HTML_id);
            }
            else { // This action has been take using the button
                var age = HTML_id.substr(HTML_id.length-1, 1);
            }
            
            var self = this;
            this.ajaxcall("/innovation/innovation/achieve.html",
                            {
                                lock: true,
                                age: age
                            },
                            this, function(result){}, function(is_error){if(is_error)self.resurrectClickEvents(true)}
           );
        },
        
        action_clicForDraw : function(event) {
            if(!this.checkAction('draw')){
                return;
            }
            this.deactivateClickEvents();
            
            var self = this;
            this.ajaxcall("/innovation/innovation/draw.html",
                            {
                                lock: true,
                            },
                            this, function(result){}, function(is_error){if(is_error)self.resurrectClickEvents(true)}
           );
        },
        
        action_clicForMeld : function(event) {
            if(!this.checkAction('meld')){
                return;
            }
            this.deactivateClickEvents();
            
            var HTML_id = this.getCardHTMLIdFromEvent(event);
            var card_id = this.getCardIdFromHTMLId(HTML_id);
            
            var self = this;
            this.ajaxcall("/innovation/innovation/meld.html",
                            {
                                lock: true,
                                card_id: card_id
                            },
                             this, function(result){}, function(is_error){if(is_error)self.resurrectClickEvents(true)}
                        );
        },
        
        action_clicForDogma : function(event) {
            if(!this.checkAction('dogma')){
                return;
            }
            
            //
            //
            //
            //TODO: Confimation dialog: 
            //
            //Get the dogma icon from the square on the card and compare players counters
            //
            var HTML_id = this.getCardHTMLIdFromEvent(event);
            var card_id = this.getCardIdFromHTMLId(HTML_id);
            
            var self = this;
            var ajax_call = function() {
                self.deactivateClickEvents();
                var selfie = self;
                self.ajaxcall("/innovation/innovation/dogma.html",
                    {
                        lock: true,
                        player_id: self.player_id,
                        card_id: card_id
                    },
                     self, function(result){/*self.deactivateClickEvents()*/}, function(is_error){if(is_error)selfie.resurrectClickEvents(false)}
                );
            }
            
            var i_demand_effect_only = dojo.query("#" + HTML_id + " .i_demand_effect_1").length == 1 && dojo.query("#" + HTML_id + " .non_demand_effect_1").length == 0
            if (i_demand_effect_only) {
                // Get dogma icons
                var dogma_icon = dojo.attr(dojo.query("#" + HTML_id + " .i_demand_effect_1 .icon_in_dogma")[0], 'class').substr(-1);
                // Compare player counters
                var player_total = this.counter.ressource_count[this.player_id][dogma_icon].getValue();
                var player_total_is_min_value = true;
                for(var player_id in this.players) {
                    if (this.counter.ressource_count[player_id][dogma_icon].getValue() < player_total) {
                        player_total_is_min_value = false;
                    }
                }
                if (player_total_is_min_value) { // Targetting this dogma would have no effect
                    // Leave an opportunity for the player to cancel his action (hence the AJAX call)
                    this.confirmationDialog(_("Activating this card will have no effect. Are you sure you want to do this?"),
                                            dojo.hitch(this, ajax_call));
                }
                else {
                    // Just make the AJAX call
                    ajax_call();
                }
            }
            else {
                // Just make the AJAX call
                ajax_call();
            }
        },
        
        action_clicForChoose : function(event) {
            if(!this.checkAction('choose')){
                return;
            }
            if (this.color_pile !== null) { // Special code where a pile needed to be selected
                var zone = this.zone.board[this.player_id][this.color_pile];
                this.setSplayMode(zone, zone.splay_direction, force_full_visible=false);
            }
            this.deactivateClickEvents();
            
            var HTML_id = this.getCardHTMLIdFromEvent(event);
            var card_id = this.getCardIdFromHTMLId(HTML_id);
            
            var self = this;
            this.ajaxcall("/innovation/innovation/choose.html",
                            {
                                lock: true,
                                card_id: card_id
                            },
                             this, function(result){}, function(is_error){if(is_error)self.resurrectClickEvents(true)}
                        );
        },
        
        action_clicForChooseRecto : function(event) {
            if(!this.checkAction('choose')){
                return;
            }
            this.deactivateClickEvents();
            
            var HTML_id = this.getCardHTMLIdFromEvent(event);
            var card_id = this.getCardIdFromHTMLId(HTML_id);
            var age = this.getCardAgeFromHTMLId(HTML_id);
            
            // Search the zone containing that card
            var zone_container = event.currentTarget.parentNode;
            var zone_infos = dojo.getAttr(zone_container, 'id').split('_');
            var location = zone_infos[0];
            var owner = zone_infos[1];
            var zone = this.getZone(location, owner, age);
            
            // Search the position the card is
            var position = this.getCardPositionFromId(zone, card_id, age);
            
            var self = this;
            this.ajaxcall("/innovation/innovation/chooseRecto.html",
                            {
                                lock: true,
                                owner: owner,
                                location: location,
                                age: age,
                                position: position
                            },
                             this, function(result){}, function(is_error){if(is_error)self.resurrectClickEvents(true)}
                        );
        },
        
        action_clicForChooseSpecialOption : function(event) {
            if(!this.checkAction('choose')){
                return;
            }
            
            var HTML_id = this.getCardHTMLIdFromEvent(event);
            var choice = HTML_id.substr(7)
            
            if (this.choose_two_colors) {
                if (this.first_chosen_color === null) {
                    this.first_chosen_color = choice;
                    dojo.destroy(event.target); // Destroy the button
                    var query = dojo.query('#pagemaintitletext > span[style]');
                    var You = query[query.length - 1].outerHTML;
                    $('pagemaintitletext').innerHTML = dojo.string.substitute(_("${You} still must choose one color"), {'You':You});
                    return;
                }
                choice = Math.pow(2,this.first_chosen_color) + Math.pow(2,choice); // Set choice as encoded value for the array of the two chosen colors
                this.first_chosen_color = null;
            }
            
            this.deactivateClickEvents();
            
            var self = this;
            this.ajaxcall("/innovation/innovation/chooseSpecialOption.html",
                            {
                                lock: true,
                                choice: choice
                            },
                             this, function(result){}, function(is_error){if(is_error)self.resurrectClickEvents(true)}
                        );
        },
        
        action_clicForPassOrStop : function() {
            if(!this.checkAction('choose')){
                return;
            }
            if (this.publication_permutations_done !== null) { // Special code for Publication: undo the changes the player made to his board
                this.publicationClicForUndoingSwaps();
                for(var color=0; color<5; color++) {
                    var zone = this.zone.board[this.player_id][color];
                    this.setSplayMode(zone, zone.splay_direction, force_full_visible=false);
                }
                this.on(dojo.query('#change_display_mode_button'), 'onclick', 'toggle_displayMode');
                //dojo.style('change_display_mode_button', {'display': 'initial'}); // Show back the button used for changing the display
                this.publication_permuted_zone = null;
                this.publication_permutations_done = null;
                this.publication_original_items = null;
            }
            else if (this.color_pile !== null) { // Special code where a pile needed to be selected
                var zone = this.zone.board[this.player_id][this.color_pile];
                this.setSplayMode(zone, zone.splay_direction, force_full_visible=false);
            }
                
            this.deactivateClickEvents();
            var self = this;
            this.ajaxcall("/innovation/innovation/choose.html",
                            {
                                lock: true,
                                card_id: -1
                            },
                             this, function(result){}, function(is_error){if(is_error)self.resurrectClickEvents(true)}
                        );            
        },
        
        action_clicForSplay : function(event) {
            if(!this.checkAction('choose')){
                return;
            }
            this.deactivateClickEvents();
            
            var HTML_id = this.getCardHTMLIdFromEvent(event);
            var color = HTML_id.substr(6)
            var self = this;
            this.ajaxcall("/innovation/innovation/choose.html",
                            {
                                lock: true,
                                card_id: this.getCardIdFromHTMLId(this.zone.board[this.player_id][color].items[0].id) // A choose for splay is equivalent as selecting a board card of the right color, by design
                            },
                             this, function(result){}, function(is_error){if(is_error)self.resurrectClickEvents(true)}
                        );   
        },
        
        action_publicationClicForRearrange : function(event) {
            if(!this.checkAction('choose')){
                return;
            }
            
            var permuted_color = this.publication_permuted_zone.container_div.slice(-1);
            var permutations_done = [];
            for(var i=0; i<this.publication_permutations_done.length; i++) {
                var permutation =this.publication_permutations_done[i];
                permutations_done.push(permutation.position + "," + permutation.delta);
            }
            permutations_done = permutations_done.join(";")
            
            this.publicationResetInterface();
            
            for(var color=0; color<5; color++) {
                var zone = this.zone.board[this.player_id][color];
                this.setSplayMode(zone, zone.splay_direction, force_full_visible=false);
            }
            this.on(dojo.query('#change_display_mode_button'), 'onclick', 'toggle_displayMode');
            //dojo.style('change_display_mode_button', {'display': 'initial'}); // Show back the button used for changing the display
            
            this.publication_permuted_zone = null;
            this.publication_permutations_done = null;
            this.publication_original_items = null;
            
            this.deactivateClickEvents();
            
            var self = this;
            this.ajaxcall("/innovation/innovation/publicationRearrange.html",
                            {
                                lock: true,
                                color: permuted_color,
                                permutations_done: permutations_done
                            },
                             this, function(result){}, function(is_error){if(is_error)self.resurrectClickEvents(true)}
                        );   
        },
        
        publicationClicForMove : function(event) {          
            var HTML_id = this.getCardHTMLIdFromEvent(event);
            
            var arrow_up = $('publication_arrow_up');
            var arrow_down = $('publication_arrow_down');
            if (!arrow_up) {
                arrow_up = dojo.create('button', {'id': 'publication_arrow_up'});
                arrow_up.innerHTML = "<span>&#8593;</span>"; // Code for arrow up
                dojo.connect(arrow_up, 'onclick', this, 'publicationClicForSwap'); 
                arrow_down = dojo.create('button', {'id': 'publication_arrow_down'});
                arrow_down.innerHTML = "<span>&#8595;</span>"; // Code for arrow down
                dojo.connect(arrow_down, 'onclick', this, 'publicationClicForSwap'); 
            }
            dojo.place(arrow_up, HTML_id);
            dojo.place(arrow_down, HTML_id);
        },
        
        publicationClicForSwap : function(event) {
            var arrow = event.currentTarget;
            var delta = arrow == $('publication_arrow_up') ? 1 : -1; // Change of position requested
            var HTML_id = dojo.getAttr(arrow.parentNode, 'id');
            var card_id = this.getCardIdFromHTMLId(HTML_id);
            var color = this.saved_cards[card_id].color;
            
            // Search position in zone
            var zone = this.zone.board[this.player_id][color];
            var items = zone.items;
            for(var p=0; p<items.length; p++) {
                var it = zone.items[p] 
                if (it.id == HTML_id) {
                    var item = it;
                    var position = p;
                    break;
                }
            }
            if (position == 0 && delta == -1 || position == items.length-1 && delta == 1) {
                return; // The card is already on max position
            }

            if (this.publication_permutations_done.length == 0) { // First change
                // Add cancel button
                var cancel = dojo.create('a', {'id':'publication_cancel', 'class' : 'bgabutton bgabutton_red'});
                cancel.innerHTML = _("Cancel");
                dojo.place(cancel, $('splay_indicator_' + this.player_id + '_' + color), 'after')
                dojo.connect(cancel, 'onclick', this, 'publicationClicForUndoingSwaps');
                
                // Add done button
                var done = dojo.create('a', {'id':'publication_done', 'class' : 'bgabutton bgabutton_blue'});
                done.innerHTML = _("Done");
                dojo.place(done, cancel, 'after')
                dojo.connect(done, 'onclick', this, 'action_publicationClicForRearrange'); 
                
                // Deactivate click events for other colors
                var other_colors = [0,1,2,3,4];
                other_colors.splice(color, 1);
                var cards = this.selectCardsOnMyBoardOfColors(other_colors);
                cards.removeClass("clickable");
                this.off(cards, 'onclick');
                
                // Mark info
                this.publication_permuted_zone = zone;
                this.publication_original_items = items.slice();
            }
            
            // Mark info
            this.publication_permutations_done.push({'position':position, 'delta':delta});
            
            // Swap positions
            this.publicationSwap(this.player_id, zone, position, delta)
            
            no_change = true;
            for(var p=0; p<items.length; p++) {
                if (items[p] != this.publication_original_items[p]) {
                    no_change = false;
                }
            }
            
            if (no_change) { // The permutation cycled to the initial situation
                // Prevent user to validate this
                this.publicationResetInterface(keep_arrows=true);
            }
        },
        
        publicationClicForUndoingSwaps : function() {
            // Undo publicationSwaps
            for(var i=this.publication_permutations_done.length-1; i>=0; i--) {
                var permutation = this.publication_permutations_done[i]
                this.publicationSwap(this.player_id, this.publication_permuted_zone, permutation.position, permutation.delta); // Re-appliying a permutation cancels it
            }
            
            // Reset interface
            this.publicationResetInterface();
        },
        
        publicationResetInterface : function(keep_arrows) {
            // Default values
            keep_arrows = this.setDefault(keep_arrows, false);
            ///////
            
            if (!keep_arrows) {
                dojo.destroy('publication_arrow_up');
                dojo.destroy('publication_arrow_down');
            }
            dojo.destroy('publication_cancel');
            dojo.destroy('publication_done');
            
            var selectable_cards = this.selectAllCardsOnBoard();
            selectable_cards.addClass("clickable");
            this.on(selectable_cards, 'onclick', 'publicationClicForMove');
            
            this.publication_permuted_zone = null;
            this.publication_permutations_done = [];
        },
        
        publicationSwap : function(player_id, zone, position, delta) {
            position = parseInt(position);
            delta = parseInt(delta);
            var item = zone.items[position];
            var other_item = zone.items[position+delta];
            item.weight += delta;
            other_item.weight -= delta;
            
            dojo.style(item.id, 'z-index', item.weight)
            dojo.style(other_item.id, 'z-index', other_item.weight)
            
            zone.items[position+delta] = item;
            zone.items[position] = other_item;
            
            // Change ressource if the card on top is involved
            if (position == zone.items.length-1 || position + delta == zone.items.length-1) {
                up = delta == 1;
                old_top_item = up ? other_item : item;
                new_top_item = up ? item : other_item;
                
                old_top_card = this.saved_cards[this.getCardIdFromHTMLId(old_top_item.id)];
                new_top_card = this.saved_cards[this.getCardIdFromHTMLId(new_top_item.id)];
                
                ressource_counts = {};
                for(var icon=1; icon<=6; icon++) {
                    ressource_counts[icon] = this.counter.ressource_count[player_id][icon].getValue();
                }
                
                switch(parseInt(zone.splay_direction)) {
                case 0: // All icons of the old top card are lost
                    ressource_counts[old_top_card.spot_1]--
                    ressource_counts[old_top_card.spot_2]--
                    ressource_counts[old_top_card.spot_3]--
                    ressource_counts[old_top_card.spot_4]--
                    
                    ressource_counts[new_top_card.spot_1]++
                    ressource_counts[new_top_card.spot_2]++
                    ressource_counts[new_top_card.spot_3]++
                    ressource_counts[new_top_card.spot_4]++
                    break;
                case 1: // Only the icon on bottom right can still be seen (spot_4)
                    ressource_counts[old_top_card.spot_1]--
                    ressource_counts[old_top_card.spot_2]--
                    ressource_counts[old_top_card.spot_3]--
                    
                    ressource_counts[new_top_card.spot_1]++
                    ressource_counts[new_top_card.spot_2]++
                    ressource_counts[new_top_card.spot_3]++
                    break;
                case 2: // Icons on left can still be seen (spot_1 and spot_2)
                    ressource_counts[old_top_card.spot_3]--
                    ressource_counts[old_top_card.spot_4]--
                    
                    ressource_counts[new_top_card.spot_3]++
                    ressource_counts[new_top_card.spot_4]++
                    break;
                case 3: // Icons on bottom can still be seen (spot_2, spot_3 and spot_4)
                    ressource_counts[old_top_card.spot_1]--
                    
                    ressource_counts[new_top_card.spot_1]++
                    break;
                }
                
                for(var icon=1; icon<=6; icon++) {
                    this.counter.ressource_count[player_id][icon].setValue(ressource_counts[icon]);
                }
                
            }
            
            zone.updateDisplay();
        },
        
        clic_display_score_window : function() {
            this.my_score_verso_window.show();
        },
        
        clic_close_score_window : function() {
            this.my_score_verso_window.hide();
        },
        
        toggle_displayMode : function() {
            // Indicate the change of display mode
            this.display_mode = !this.display_mode;
            
            var button_text = this.display_mode ? this.text_for_expanded_mode : this.text_for_compact_mode;
            var arrows =  this.display_mode ? this.arrows_for_expanded_mode : this.arrows_for_compact_mode;
            
            var inside_button = this.format_string_recursive("${arrows} ${button_text}", {'arrows':arrows, 'button_text':button_text, 'i18n':['button_text']});
            
            $('change_display_mode_button').innerHTML = inside_button;
            
            // Update the display of the piles
            for(var player_id in this.players) {
                for(var color = 0; color < 5; color++){
                    var zone = this.zone.board[player_id][color];
                    this.setSplayMode(zone, zone.splay_direction);
                }
            }
            
            if (!this.isSpectator) {
                // Inform the server of this change to make it by default if the player refreshes the page
                this.ajaxcall("/innovation/innovation/updateDisplayMode.html",
                            {
                                lock: true,
                                display_mode: this.display_mode
                            },
                             this, function(result){}, function(is_error){}
                        );
            }
        },
        
        toggle_view : function() {
            // Indicate the change of view
            this.view_full = !this.view_full;
            
            var button_text = this.view_full ? this.text_for_view_full : this.text_for_view_normal;
            
            var inside_button = this.format_string_recursive("${button_text}", {'button_text':button_text, 'i18n':['button_text']});
            
            $('change_view_full_button').innerHTML = inside_button;
            
            // Update the display of the piles
            for(var player_id in this.players) {
                for(var color = 0; color < 5; color++){
                    var zone = this.zone.board[player_id][color];
                    this.setSplayMode(zone, zone.splay_direction);
                }
            }
            
            if (!this.isSpectator) {
                // Inform the server of this change to make it by default if the player refreshes the page
                this.ajaxcall("/innovation/innovation/updateViewFull.html",
                            {
                                lock: true,
                                view_full: this.view_full
                            },
                             this, function(result){}, function(is_error){}
                        );
            }
        },
        
        ///////////////////////////////////////////////////
        //// Reaction to cometD notifications

        /*
            setupNotifications:
            
            In this method, you associate each of your game notifications with your local method to handle it.
            
            Note: game notification names correspond to "notifyAllPlayers" and "notifyPlayer" calls in
                  your innovation.game.php file.
        
        */
        setupNotifications: function()
        {
            console.log('notifications subscriptions setup');
            
            // TODO: here, associate your game notifications with local methods
            
            // Example 1: standard notification handling
            // dojo.subscribe('cardPlayed', this, "notif_cardPlayed");
            
            // Example 2: standard notification handling + tell the user interface to wait
            //            during 3 seconds after calling the method in order to let the players
            //            see what is happening in the game.
            // dojo.subscribe('cardPlayed', this, "notif_cardPlayed");
            // this.notifqueue.setSynchronous('cardPlayed', 3000);
            // 
            
            var reasonnable_delay = 1000;
            
            dojo.subscribe('transferedCard', this, "notif_transferedCard");
            this.notifqueue.setSynchronous( 'transferedCard', reasonnable_delay );   // Wait X milliseconds after executing the transferedCard handler
            
            dojo.subscribe('splayedPile', this, "notif_splayedPile")
            this.notifqueue.setSynchronous( 'splayedPile', reasonnable_delay );   // Wait X milliseconds after executing the splayedPile handler
            
            dojo.subscribe('rearrangedPile', this, "notif_rearrangedPile");  // This kind of notification does not need any delay
            
            dojo.subscribe('removedHandsBoardsAndScores', this, "notif_removedHandsBoardsAndScores");  // This kind of notification does not need any delay
            
            dojo.subscribe('log', this, "notif_log"); // This kind of notification does not change anything but log on the interface, no delay
            
            if (this.isSpectator) {
                dojo.subscribe('transferedCard_spectator', this, "notif_transferedCard_spectator");
                this.notifqueue.setSynchronous( 'transferedCard_spectator', reasonnable_delay );   // Wait X milliseconds after executing the handler
                
                dojo.subscribe('splayedPile_spectator', this, "notif_splayedPile_spectator");
                this.notifqueue.setSynchronous( 'splayedPile_spectator', reasonnable_delay );   // Wait X milliseconds after executing the handler
                
                dojo.subscribe('rearrangedPile_spectator', this, "notif_rearrangedPile_spectator"); // This kind of notification does not need any delay
                
                dojo.subscribe('removedHandsBoardsAndScores_spectator', this, "notif_removedHandsBoardsAndScores_spectator");  // This kind of notification does not need any delay
                
                dojo.subscribe('log_spectator', this, "notif_log_spectator"); // This kind of notification does not change anything but log on the interface, no delay
            };
        },
        
        notif_transferedCard : function(notif) {
            var card = notif.args;
            
            // Special code for my score management
            if (card.location_from == "score" && card.owner_from == this.player_id) {
                // Remove the card from my score personal window
                this.removeFromZone(this.zone.my_score_verso, card.id, true, card.age);
            }
            
            var zone_from = card.age === null ? this.zone.special_achievements[0] : this.getZone(card.location_from, card.owner_from, card.age, card.color);
            var zone_to = this.getZone(card.location_to, card.owner_to, card.age, card.color);
            
            var visible_from = this.getCardTypeInZone(zone_from.HTML_class) == "card" || card.age === null; // Special achievements are considered visible too
            var visible_to = this.getCardTypeInZone(zone_to.HTML_class) == "card" || card.age === null; // Special achievements are considered visible too
            
            
            var id_from;
            var id_to;
            if (visible_from) {
                // The card is shown at the start (verso)
                id_from = card.id;
                if (visible_to) {
                    id_to = id_from // verso -> verso
                }
                else {
                    id_to = null; // verso -> recto: the card is being hidden. A new id must be created for the recto
                }
            }
            else {
                // The card is hidden at the start (recto)
                var id_from = this.getCardIdFromPosition(zone_from, card.position_from, card.age);
                if (visible_to) {
                    id_to = card.id // recto -> verso: the card is being revealed
                }
                else {
                    id_to = id_from; // recto -> recto
                }
            }
            
            // Update BGA score if needed
            if(card.location_to == 'achievements') {
                // Increment player BGA score (all the team in team game)
                var player_team = this.players[card.owner_to].player_team;
                for(var player_id in this.players) {
                    if (this.players[player_id].player_team == player_team) {
                        this.scoreCtrl[player_id].incValue(1);
                    }
                }
            }
            
            // Update counters for score and ressource if needed
            
            // 1 player involved
            if(card.new_score !== undefined) {
                this.counter.score[card.player_id].setValue(card.new_score);
            }
            if(card.new_ressource_counts !== undefined) {
                for(var icon=1; icon<=6; icon++) {
                    this.counter.ressource_count[card.player_id][icon].setValue(card.new_ressource_counts[icon]);
                }
            }
            if(card.new_max_age_on_board !== undefined) {
                this.counter.max_age_on_board[card.player_id].setValue(card.new_max_age_on_board);
            }
            // 2 players involved
            if(card.new_score_from !== undefined) {
                this.counter.score[card.owner_from].setValue(card.new_score_from);
            }
            if(card.new_score_to !== undefined) {
                this.counter.score[card.owner_to].setValue(card.new_score_to);
            }
            if(card.new_ressource_counts_from !== undefined) {
                for(var icon=1; icon<=6; icon++) {
                    this.counter.ressource_count[card.owner_from][icon].setValue(card.new_ressource_counts_from[icon]);
                }
            }
            if(card.new_ressource_counts_to !== undefined) {
                for(var icon=1; icon<=6; icon++) {
                    this.counter.ressource_count[card.owner_to][icon].setValue(card.new_ressource_counts_to[icon]);
                }
            }
            if(card.new_max_age_on_board_from !== undefined) {
                this.counter.max_age_on_board[card.owner_from].setValue(card.new_max_age_on_board_from);
            }
            if(card.new_max_age_on_board_to !== undefined) {
                this.counter.max_age_on_board[card.owner_to].setValue(card.new_max_age_on_board_to);
            }


            this.moveBetweenZones(zone_from, zone_to, id_from, id_to, card);
            
            // Special code for my score management
            if (card.location_to == "score" && card.owner_to == this.player_id) {
                // Add the card to my score personal window
                this.createAndAddToZone(this.zone.my_score_verso, card.position_to, card.age, card.id, dojo.body(), card);
                visible_to = true;
            }
            
            // Add tooltip
            if (visible_to) {
                card.owner = card.owner_to;
                card['location'] = card.location_to;
                card.position = card.position_to;
                card.splay_direction = card.splay_direction_to;
                this.addTooltipForCard(card);
            }
            else if (card.location_to == 'achievements' && card.age !== null) {
                var HTML_id = this.getCardHTMLId(card.id, card.age, zone_from.HTML_class);
                this.removeTooltip(HTML_id);
                card.owner = card.owner_to;
                card['location'] = card.location_to;
                card.position = card.position_to;
                this.addTooltipForRecto(card, false);
            }
        },
        
        notif_splayedPile: function(notif) {
            var player_id = notif.args.player_id;
            var color = notif.args.color;
            var splay_direction = notif.args.splay_direction;
            var splay_direction_in_clear = notif.args.splay_direction_in_clear;
            var forced_unsplay = notif.args.forced_unsplay;
            
            // Change the splay mode of the matching zone on board
            this.setSplayMode(this.zone.board[player_id][color], splay_direction);
            
            // Update the splay indicator
            var splay_indicator = 'splay_indicator_' + player_id + '_' + color;
            for(var direction = 0; direction < 4; direction++) {
                if (direction == splay_direction) {
                    dojo.addClass(splay_indicator, 'splay_' + direction);
                }
                else {
                    dojo.removeClass(splay_indicator, 'splay_' + direction);
                }
            }

            // Update the tooltip text if needed
            this.removeTooltip('splay_' + player_id + '_' + color);
            if (splay_direction > 0) {
                this.addCustomTooltip('splay_indicator_' + player_id + '_' + color, dojo.string.substitute(_('This pile is splayed ${direction}.'), {'direction': '<b>' + splay_direction_in_clear + '</b>'}), '')
            }
            
            // Update the ressource counts for that player
            if (splay_direction > 0 || forced_unsplay) {
                for(var icon=1; icon<=6; icon++) {
                    this.counter.ressource_count[player_id][icon].setValue(notif.args.new_ressource_counts[icon]);
                }
            }
            
            // Add or remove the button for splay mode based on still splayed colors
            if (splay_direction == 0) {
                this.number_of_splayed_piles--;
                if (this.number_of_splayed_piles == 0) { // Now there is no more color splayed for any player
                    this.disableButtonForSplayMode();
                }
            }
            else {
                this.number_of_splayed_piles++;
                if (this.number_of_splayed_piles == 1) { // Now there is one color splayed for one player
                    this.enableButtonForSplayMode();
                }
            }
        },
        
        notif_rearrangedPile: function(notif) {
            var player_id = notif.args.player_id;
            var rearrangement = notif.args.rearrangement;
            
            var color = rearrangement.color;
            var permutations_done = rearrangement.permutations_done;
            
            var permuted_zone = this.zone.board[player_id][color];
            
            // Make the permutations on the corresponding opponent pile
            for(var i=0; i<permutations_done.length; i++) {
                var permutation = permutations_done[i];
                this.publicationSwap(player_id, permuted_zone, permutation.position, permutation.delta);
            }
        },
        
        notif_removedHandsBoardsAndScores: function(notif) {
            // Remove all cards from the interface (except decks and achievements)
            this.zone.my_score_verso.removeAll();
            for(var player_id in this.players) {
                this.zone.revealed[player_id].removeAll();
                this.zone.hand[player_id].removeAll();
                this.zone.score[player_id].removeAll();
                for(var color=0; color<5; color++) {
                    this.zone.board[player_id][color].removeAll();
                }
            }
            
            // Reset counters
            // Counters for score, number of cards in hand and max age
            for(var player_id in this.players) {
                this.counter.score[player_id].setValue(0);
                this.zone.hand[player_id].counter.setValue(0);
                this.counter.max_age_on_board[player_id].setValue(0);
            }
            
            // Counters for ressources
            for(var player_id in this.players) {
                for(var icon=1; icon<=6; icon++) {
                    this.counter.ressource_count[player_id][icon].setValue(0);
                }
            }
            
            // Unsplay all piles and update the splay indicator (show nothing bacause there are no more splayed pile)
            for(var player_id in this.players) {
                for(var color=0; color<5; color++) {
                    this.setSplayMode(this.zone.board[player_id][color], 0)
                    var splay_indicator = 'splay_indicator_' + player_id + '_' + color;
                    dojo.addClass(splay_indicator, 'splay_0');
                    for(var direction = 1; direction < 4; direction++) {
                        dojo.removeClass(splay_indicator, 'splay_' + direction);
                    }
                }
            }
            
            // Disable the button for splay mode
            this.disableButtonForSplayMode();
            this.number_of_splayed_piles = 0;
        },
        
        notif_log: function(notif) {
            // No change on the interface
            return;
        },
        
        /*
         * This special notification is the only one spectators can subscribe to.
         * They redirect to normal notification adressed to players which are not involved by the current action.
         * 
         */
        
        notif_transferedCard_spectator: function(notif) {
            // Put the message for the spectator in log
            this.log_for_spectator(notif);
            
            // Call normal notif
            this.notif_transferedCard(notif);
        },

        notif_splayedPile_spectator: function(notif) {
            // Put the message for the spectator in log
            this.log_for_spectator(notif);
            
            // Call normal notif
            this.notif_splayedPile(notif);
        },
        
        notif_rearrangedPile_spectator: function(notif) {
            // Put the message for the spectator in log
            this.log_for_spectator(notif);
            
            // Call normal notif
            this.notif_rearrangedPile(notif);
        },
        
        notif_removedHandsBoardsAndScores_spectator: function(notif) {
            // Put the message for the spectator in log
            this.log_for_spectator(notif);
            
            // Call normal notif
            this.notif_removedHandsBoardsAndScores(notif);
        },
        
        notif_log_spectator: function(notif) {
            // Put the message for the spectator in log
            this.log_for_spectator(notif);
            
            // Call normal notif
            this.notif_log(notif);
        },        
        
        log_for_spectator: function(notif) {
            notif.args = this.notifqueue.playerNameFilterGame(notif.args);
            notif.args.log = this.format_string_recursive(notif.args.log, notif.args); // Enable translation
            var log = "<div class='log' style='height: auto; display: block; color: rgb(0, 0, 0);'><div class='roundedbox'>" + notif.args.log + "</div></div>"
            dojo.place(log, $('logs'), 'first');
        },
        
        /* This enable to inject translatable styled things to logs or action bar */
        /* @Override */
        format_string_recursive : function(log, args) {
            try {
                if (log && args && !args.processed) {
                    args.processed = true;
                    
                    if (!this.isSpectator) {
                        args.You = this.getColoredText(_('You')); // will replace ${You} with colored version
                        args.you = this.getColoredText(_('you')); // will replace ${you} with colored version
                        args.Your = this.getColoredText(_('Your')); // will replace ${Your} with colored version
                        args.your = this.getColoredText(_('your')); // will replace ${your} with colored version
                        args.player_name_as_you = this.getColoredText(_('You'));
                    }
                    
                    if (typeof args.card_name == 'string') {
                         args.card_name = this.getCardChain(args);
                    }
                    if (this.player_id == args.opponent_id) { // Is that player the opponent?
                        args.message_for_others = args.message_for_opponent;
                    }
                }
            } catch (e) {
                console.error(log,args,"Exception thrown", e.stack);
            }
            return this.inherited(arguments);
        },

        /* Implementation of proper colored You with background in case of white or light colors  */

        getColoredText : function(translatable_text, player_id) {
            // Default values
            player_id = this.setDefault(player_id, this.player_id);
            ///////
            var color = this.gamedatas.players[player_id].color;
            return "<span style='font-weight:bold;color:#" + color + "'>" + translatable_text + "</span>";
        },
        
        getCardChain : function(args) {
            var cards = [];
            for(var i=0; i<=9; i++) {
                if (typeof args['card_'+i] != 'string') {
                    break;
                }
                cards.push(this.getColoredText(_(args['card_'+i]), args['ref_player_'+i]));
            }
            var arrow = '&rarr;';
            return cards.join(arrow);
        }
   });
});
