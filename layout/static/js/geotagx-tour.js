/*
 * The GeoTag-X tour helper.
 */
;(function(geotagx, $, undefined){
	"use strict";

	var api_ = {}; // The tour API.
	var questionnaireTour_ = null;

	/**
	 * Returns true if the questionnaire tour ended, false otherwise.
	 */
	api_.questionnaireTourEnded = function(){
		return localStorage.getItem("geotagx_questionnaire_tour_end") === "yes";
	};
	/**
	 * Starts a questionnaire tour.
	 */
	api_.startQuestionnaireTour = function(){
		if (!questionnaireTour_){
			questionnaireTour_ = new Tour({
				name:"geotagx_questionnaire_tour",
				orphan:true,
				steps:[
					{
						orphan:true,
						title:"Welcome!",
						content:"It seems as though you are new around here. How about we take a tour?<br><small>Note: You can navigate faster by using the <kbd>&#8592;</kbd> and <kbd>&#8594;</kbd> arrow keys.</small>"
					},
					{
						element: "#questionnaire-summary",
						placement:"bottom",
						title:"The Summary",
						content:"This section provides feedback while you progress through the questionnaire."
					},
					{
						element: "#image-section",
						placement:"top",
						title:"The Image",
						content:"You will be tasked with analysing an image. When you complete an analysis, a new image will be presented to you."
					},
					{
						element: "#questionnaire-question-1 > .answer button[value='NotClear']",
						placement:"bottom",
						title:"Image not clear",
						content:"If the image is not clear, blurry or its quality is too poor, you can skip it by selecting this."
					},
					{
						element: "#questionnaire-question-1 > .title",
						placement:"bottom",
						title:"The Question",
						content:"This is one of many questions asked about the image to the right. Try to answer it to the best of your capabilities ..."
					},
					{
						element: "#questionnaire-question-1 .help-toggle",
						placement:"bottom",
						title:"Help!",
						content:"... but remember, if you are having trouble answering a question, take a look at the help ..."
					},
					{
						element: "#image-source",
						placement:"bottom",
						title:"Image source",
						content:"... and the image source. More often than not, the source will give you contextual information that may prove to be invaluable."
					},
					{
						element: "#questionnaire-question-1 > .answer button[value='Unknown']",
						placement:"bottom",
						title:"You're only human",
						content:"Sometimes a question may prove challenging. If you can not answer it, your best bet is to select this answer."
					}

				]
			});
			questionnaireTour_.init();
		}

		// Set the tour's initial step so that it starts from the beginning.
		localStorage.setItem("geotagx_questionnaire_tour_current_step", 0);
		questionnaireTour_.start(true);
	};

	// Expose the API.
	geotagx.tour = api_;
})(window.geotagx = window.geotagx || {}, jQuery);
