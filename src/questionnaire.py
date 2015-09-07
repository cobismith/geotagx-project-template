# This module is part of the GeoTag-X project builder.
# Copyright (C) 2015 UNITAR.
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program. If not, see <http://www.gnu.org/licenses/>.
from src.question import Question

class Questionnaire:
	questions = None
	questiontypes = None
	controlflow = None


	def __init__(self, questions):
		"""__init__(questions:list)
		Instantiates a Questionnaire object from the list of specified questions.
		"""
		assert isinstance(questions, list), "Error! The 'questions' field must be a list."
		if len(questions) < 1:
			raise Exception("Error! A questionnaire requires one or more questions.")
		else:
			import collections

			self.questions = collections.OrderedDict()
			self.controlflow = {}
			self.questiontypes = set()

			for configuration in questions:
				assert isinstance(configuration, dict), "Error! A question entry must be a dictionary."

				# Check for mandatory keys.
				for field in ["key", "type", "question"]:
					if field not in configuration:
						raise Exception("Error! A questionnaire entry is missing the field '{}'.".format(field))

				key = configuration["key"]
				key = str(key).strip() if isinstance(key, basestring) else None

				valid, message = self.iskey(key, configuration["question"])
				if valid:
					question = Question(key, configuration)
					self.questions[key] = question
					self.controlflow[key] = configuration.get("branch")
					self.questiontypes.add(question.type)
				else:
					raise Exception(message)

			# Convert the strings used as conditions in conditional branches to
			# lowercase. This will allow the template scripts to perform
			# case-insensitive string comparisons.
			for branch in [b for b in self.controlflow.values() if b is not None and isinstance(b, dict)]:
				for key in branch.keys():
					branch[key.lower()] = branch.pop(key)

			valid, message = Questionnaire.isvalid(self)
			if not valid:
				raise Exception(message)


	def iskey(self, key, question=None):
		"""iskey(key:string, question:string)
		Returns true if the specified key is valid, false otherwise.
		In addition to being a non-empty string and not a reserved keyword, keys
		must also be unique in each questionnaire.
		"""
		valid, message = Question.iskey(key)
		if not valid:
			return (False, message)
		elif key in self.questions:
			return (
				False,
				"""Error! The key '{0}' is used to identify the following questions:
				\r    - {1}
				\r    - {2}
				\rPlease make sure each question has a unique key.""".format(
					key,
					self.questions[key].question,
					question
				)
			)
		return (True, None)


	def isbranchablekey(self, key):
		"""isbranchablekey(key:string|dict)
		Returns true if the specified key is valid, false otherwise.
		A branch key is valid if

		a iff it branches to an existing or predefined key. As
		such, this method is best used when the entire questionnaire has been
		parsed.
		"""
		valid, message = True, None
		if not (isinstance(key, basestring) or isinstance(key, dict)):
			valid, message = False, "Error! The key is not a string or dictionary."
		elif isinstance(key, basestring) and not (key in self.questions or key == "end"):
			valid, message = False, "Error! The key '{}' does not correspond to a question.".format(key)
		elif isinstance(key, dict):
			for subkey in key.values():
				valid, message = self.isbranchablekey(subkey)
				if not valid:
					break

		return (valid, message)


	def __len__(self):
		"""
		Returns the number of questions in the questionnaire.
		"""
		return 0 if self.questions is None else len(self.questions)


	def __str__(self):
		"""
		Returns the list of questions in string format.
		"""
		output = []
		for i, entry in enumerate(self.questions.values(), start=1):
			output.append("{}. {} ({})".format(i, entry.question, entry.key))

		return "\n".join(output) if len(output) > 0 else "Empty questionnaire."


	@staticmethod
	def isvalid(questionnaire):
		"""isvalid(questionnaire:Questionnaire)
		Returns true if the questionnaire is valid, false otherwise.
		"""
		valid, message = True, None
		if questionnaire is not None:
			if questionnaire.questions is not None:
				for question in questionnaire.questions.values():
					valid, message = Question.isvalid(question)
					if not valid:
						break

				# If the questionnaire entries are valid, validate the control flow.
				if valid and questionnaire.controlflow is not None:
					for k in [k for k in questionnaire.controlflow.values() if k is not None]:
						valid, message = questionnaire.isbranchablekey(k)
						if not valid:
							break
			else:
				valid, message = False, "Error! Empty questionnaire. A questionnaire must contain at least one question."
		else:
			valid, message = False, "Error! A 'NoneType' object is not considered a questionnaire."

		return (valid, message)
