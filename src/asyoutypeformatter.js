!=
      this.removeNationalPrefixFromNationalNumber_();
};


/**
 * @param {string} nextChar
 * @return {boolean}
 * @private
 */
i18n.phonenumbers.AsYouTypeFormatter.prototype.isDigitOrLeadingPlusSign_ =
    function(nextChar) {
  return i18n.phonenumbers.PhoneNumberUtil.CAPTURING_DIGIT_PATTERN
      .test(nextChar) ||
      (this.accruedInput_.getLength() == 1 &&
       i18n.phonenumbers.PhoneNumberUtil.PLUS_CHARS_PATTERN.test(nextChar));
};


/**
 * Check to see if there is an exact pattern match for these digits. If so, we
 * should use this instead of any other formatting template whose
 * leadingDigitsPattern also matches the input.
 * @return {string}
 * @private
 */
i18n.phonenumbers.AsYouTypeFormatter.prototype.attemptToFormatAccruedDigits_ =
    function() {

  /** @type {string} */
  var nationalNumber = this.nationalNumber_.toString();
  /** @type {number} */
  var possibleFormatsLength = this.possibleFormats_.length;
  for (var i = 0; i < possibleFormatsLength; ++i) {
    /** @type {i18n.phonenumbers.NumberFormat} */
    var numberFormat = this.possibleFormats_[i];
    /** @type {string} */
    var pattern = numberFormat.getPatternOrDefault();
    /** @type {RegExp} */
    var patternRegExp = new RegExp('^(?:' + pattern + ')$');
    if (patternRegExp.test(nationalNumber)) {
      this.shouldAddSpaceAfterNationalPrefix_ =
          i18n.phonenumbers.AsYouTypeFormatter.
          NATIONAL_PREFIX_SEPARATORS_PATTERN_.test(
              numberFormat.getNationalPrefixFormattingRule());
      /** @type {string} */
      var formattedNumber = nationalNumber.replace(new RegExp(pattern, 'g'),
                                                   numberFormat.getFormat());
      return this.appendNationalNumber_(formattedNumber);
    }
  }
  return '';
};


/**
 * Combines the national number with any prefix (IDD/+ and country code or
 * national prefix) that was collected. A space will be inserted between them if
 * the current formatting template indicates this to be suitable.
 * @param {string} nationalNumber The number to be appended.
 * @return {string} The combined number.
 * @private
 */
i18n.phonenumbers.AsYouTypeFormatter.prototype.appendNationalNumber_ =
    function(nationalNumber) {
  /** @type {number} */
  var prefixBeforeNationalNumberLength =
      this.prefixBeforeNationalNumber_.getLength();
  if (this.shouldAddSpaceAfterNationalPrefix_ &&
      prefixBeforeNationalNumberLength > 0 &&
      this.prefixBeforeNationalNumber_.toString().charAt(
          prefixBeforeNationalNumberLength - 1) !=
      i18n.phonenumbers.AsYouTypeFormatter.SEPARATOR_BEFORE_NATIONAL_NUMBER_) {
    // We want to add a space after the national prefix if the national prefix
    // formatting rule indicates that this would normally be done, with the
    // exception of the case where we already appended a space because the NDD
    // was surprisingly long.
    return this.prefixBeforeNationalNumber_ +
        i18n.phonenumbers.AsYouTypeFormatter.SEPARATOR_BEFORE_NATIONAL_NUMBER_ +
        nationalNumber;
  } else {
    return this.prefixBeforeNationalNumber_ + nationalNumber;
  }
};


/**
 * Returns the current position in the partially formatted phone number of the
 * character which was previously passed in as the parameter of
 * {@link #inputDigitAndRememberPosition}.
 *
 * @return {number}
 */
i18n.phonenumbers.AsYouTypeFormatter.prototype.getRememberedPosition =
    function() {

  if (!this.ableToFormat_) {
    return this.originalPosition_;
  }
  /** @type {number} */
  var accruedInputIndex = 0;
  /** @type {number} */
  var currentOutputIndex = 0;
  /** @type {string} */
  var accruedInputWithoutFormatting =
      this.accruedInputWithoutFormatting_.toString();
  /** @type {string} */
  var currentOutput = this.currentOutput_.toString();
  while (accruedInputIndex < this.positionToRemember_ &&
         currentOutputIndex < currentOutput.length) {
    if (accruedInputWithoutFormatting.charAt(accruedInputIndex) ==
        currentOutput.charAt(currentOutputIndex)) {
      accruedInputIndex++;
    }
    currentOutputIndex++;
  }
  return currentOutputIndex;
};


/**
 * Attempts to set the formatting template and returns a string which contains
 * the formatted version of the digits entered so far.
 *
 * @return {string}
 * @private
 */
i18n.phonenumbers.AsYouTypeFormatter.prototype.
    attemptToChooseFormattingPattern_ = function() {

  /** @type {string} */
  var nationalNumber = this.nationalNumber_.toString();
  // We start to attempt to format only when at least MIN_LEADING_DIGITS_LENGTH
  // digits of national number (excluding national prefix) have been entered.
  if (nationalNumber.length >=
      i18n.phonenumbers.AsYouTypeFormatter.MIN_LEADING_DIGITS_LENGTH_) {
    this.getAvailableFormats_(nationalNumber);
    // See if the accrued digits can be formatted properly already.
    var formattedNumber = this.attemptToFormatAccruedDigits_();
    if (formattedNumber.length > 0) {
      return formattedNumber;
    }
    return this.maybeCreateNewTemplate_() ?
        this.inputAccruedNationalNumber_() : this.accruedInput_.toString();
  } else {
    return this.appendNationalNumber_(nationalNumber);
  }
};


/**
 * Invokes inputDigitHelper on each digit of the national number accrued, and
 * returns a formatted string in the end.
 *
 * @return {string}
 * @private
 */
i18n.phonenumbers.AsYouTypeFormatter.prototype.inputAccruedNationalNumber_ =
    function() {

  /** @type {string} */
  var nationalNumber = this.nationalNumber_.toString();
  /** @type {number} */
  var lengthOfNationalNumber = nationalNumber.length;
  if (lengthOfNationalNumber > 0) {
    /** @type {string} */
    var tempNationalNumber = '';
    for (var i = 0; i < lengthOfNationalNumber; i++) {
      tempNationalNumber =
          this.inputDigitHelper_(nationalNumber.charAt(i));
    }
    return this.ableToFormat_ ?
        this.appendNationalNumber_(tempNationalNumber) :
        this.accruedInput_.toString();
  } else {
    return this.prefixBeforeNationalNumber_.toString();
  }
};


/**
 * @return {boolean} true if the current country is a NANPA country and the
 *     national number begins with the national prefix.
 * @private
 */
i18n.phonenumbers.AsYouTypeFormatter.prototype.
    isNanpaNumberWithNationalPrefix_ = function() {
  // For NANPA numbers beginning with 1[2-9], treat the 1 as the national
  // prefix. The reason is that national significant numbers in NANPA always
  // start with [2-9] after the national prefix. Numbers beginning with 1[01]
  // can only be short/emergency numbers, which don't need the national prefix.
  if (this.currentMetadata_.getCountryCode() != 1) {
    return false;
  }
  /** @type {string} */
  var nationalNumber = this.nationalNumber_.toString();
  return (nationalNumber.charAt(0) == '1') &&
      (nationalNumber.charAt(1) != '0') &&
      (nationalNumber.charAt(1) != '1');
};


/**
 * Returns the national prefix extracted, or an empty string if it is not
 * present.
 * @return {string}
 * @private
 */
i18n.phonenumbers.AsYouTypeFormatter.prototype.
    removeNationalPrefixFromNationalNumber_ = function() {

  /** @type {string} */
  var nationalNumber = this.nationalNumber_.toString();
  /** @type {number} */
  var startOfNationalNumber = 0;
  if (this.isNanpaNumberWithNationalPrefix_()) {
    startOfNationalNumber = 1;
    this.prefixBeforeNationalNumber_.append('1').append(
        i18n.phonenumbers.AsYouTypeFormatter.SEPARATOR_BEFORE_NATIONAL_NUMBER_);
    this.isCompleteNumber_ = true;
  } else if (this.currentMetadata_.hasNationalPrefixForParsing()) {
    /** @type {RegExp} */
    var nationalPrefixForParsing = new RegExp(
        '^(?:' + this.currentMetadata_.getNationalPrefixForParsing() + ')');
    /** @type {Array.<string>} */
    var m = nationalNumber.match(nationalPrefixForParsing);
    // Since some national prefix patterns are entirely optional, check that a
    // national prefix could actually be extracted.
    if (m != null && m[0] != null && m[0].length > 0) {
      // When the national prefix is detected, we use international formatting
      // rules instead of national ones, because national formatting rules could
      // contain local formatting rules for numbers entered without area code.
      this.isCompleteNumber_ = true;
      startOfNationalNumber = m[0].length;
      this.prefixBeforeNationalNumber_.append(nationalNumber.substring(0,
          startOfNationalNumber));
    }
  }
  this.nationalNumber_.clear();
  this.nationalNumber_.append(nationalNumber.substring(startOfNationalNumber));
  return nationalNumber.substring(0, startOfNationalNumber);
};


/**
 * Extracts IDD and plus sign to prefixBeforeNationalNumber when they are
 * available, and places the remaining input into nationalNumber.
 *
 * @return {boolean} true when accruedInputWithoutFormatting begins with the
 *     plus sign or valid IDD for defaultCountry.
 * @private
 */
i18n.phonenumbers.AsYouTypeFormatter.prototype.attemptToExtractIdd_ =
    function() {

  /** @type {string} */
  var accruedInputWithoutFormatting =
      this.accruedInputWithoutFormatting_.toString();
  /** @type {RegExp} */
  var internationalPrefix = new RegExp(
      '^(?:' + '\\' + i18n.phonenumbers.PhoneNumberUtil.PLUS_SIGN + '|' +
      this.currentMetadata_.getInternationalPrefix() + ')');
  /** @type {Array.<string>} */
  var m = accruedInputWithoutFormatting.match(internationalPrefix);
  if (m != null && m[0] != null && m[0].length > 0) {
    this.isCompleteNumber_ = true;
    /** @type {number} */
    var startOfCountryCallingCode = m[0].length;
    this.nationalNumber_.clear();
    this.nationalNumber_.append(
        accruedInputWithoutFormatting.substring(startOfCountryCallingCode));
    this.prefixBeforeNationalNumber_.clear();
    this.prefixBeforeNationalNumber_.append(
        accruedInputWithoutFormatting.substring(0, startOfCountryCallingCode));
    if (accruedInputWithoutFormatting.charAt(0) !=
        i18n.phonenumbers.PhoneNumberUtil.PLUS_SIGN) {
      this.prefixBeforeNationalNumber_.append(
          i18n.phonenumbers.AsYouTypeFormatter.
          SEPARATOR_BEFORE_NATIONAL_NUMBER_);
    }
    return true;
  }
  return false;
};


/**
 * Extracts the country calling code from the beginning of nationalNumber to
 * prefixBeforeNationalNumber when they are available, and places the remaining
 * input into nationalNumber.
 *
 * @return {boolean} true when a valid country calling code can be found.
 * @private
 */
i18n.phonenumbers.AsYouTypeFormatter.prototype.
    attemptToExtractCountryCallingCode_ = function() {

  if (this.nationalNumber_.getLength() == 0) {
    return false;
  }
  /** @type {!goog.string.StringBuffer} */
  var numberWithoutCountryCallingCode = new goog.string.StringBuffer();
  /** @type {number} */
  var countryCode = this.phoneUtil_.extractCountryCode(
      this.nationalNumber_, numberWithoutCountryCallingCode);
  if (countryCode == 0) {
    return false;
  }
  this.nationalNumber_.clear();
  this.nationalNumber_.append(numberWithoutCountryCallingCode.toString());
  /** @type {string} */
  var newRegionCode = this.phoneUtil_.getRegionCodeForCountryCode(countryCode);
  if (i18n.phonenumbers.PhoneNumberUtil.REGION_CODE_FOR_NON_GEO_ENTITY ==
      newRegionCode) {
    this.currentMetadata_ =
        this.phoneUtil_.getMetadataForNonGeographicalRegion(countryCode);
  } else if (newRegionCode != this.defaultCountry_) {
    this.currentMetadata_ = this.getMetadataForRegion_(newRegionCode);
  }
  /** @type {string} */
  var countryCodeString = '' + countryCode;
  this.prefixBeforeNationalNumber_.append(countryCodeString).append(
      i18n.phonenumbers.AsYouTypeFormatter.SEPARATOR_BEFORE_NATIONAL_NUMBER_);
  // When we have successfully extracted the IDD, the previously extracted NDD
  // should be cleared because it is no longer valid.
  this.extractedNationalPrefix_ = '';
  return true;
};


/**
 * Accrues digits and the plus sign to accruedInputWithoutFormatting for later
 * use. If nextChar contains a digit in non-ASCII format (e.g. the full-width
 * version of digits), it is first normalized to the ASCII version. The return
 * value is nextChar itself, or its normalized version, if nextChar is a digit
 * in non-ASCII format. This method assumes its input is either a digit or the
 * plus sign.
 *
 * @param {string} nextChar
 * @param {boolean} rememberPosition
 * @return {string}
 * @private
 */
i18n.phonenumbers.AsYouTypeFormatter.prototype.
    normalizeAndAccrueDigitsAndPlusSign_ = function(nextChar,
                                                    rememberPosition) {

  /** @type {string} */
  var normalizedChar;
  if (nextChar == i18n.phonenumbers.PhoneNumberUtil.PLUS_SIGN) {
    normalizedChar = nextChar;
    this.accruedInputWithoutFormatting_.append(nextChar);
  } else {
    normalizedChar = i18n.phonenumbers.PhoneNumberUtil.DIGIT_MAPPINGS[nextChar];
    this.accruedInputWithoutFormatting_.append(normalizedChar);
    this.nationalNumber_.append(normalizedChar);
  }
  if (rememberPosition) {
    this.positionToRemember_ = this.accruedInputWithoutFormatting_.getLength();
  }
  return normalizedChar;
};


/**
 * @param {string} nextChar
 * @return {string}
 * @private
 */
i18n.phonenumbers.AsYouTypeFormatter.prototype.inputDigitHelper_ =
    function(nextChar) {

  // Note that formattingTemplate is not guaranteed to have a value, it could be
  // empty, e.g. when the next digit is entered after extracting an IDD or NDD.
  /** @type {string} */
  var formattingTemplate = this.formattingTemplate_.toString();
  if (formattingTemplate.substring(this.lastMatchPosition_)
      .search(this.DIGIT_PATTERN_) >= 0) {
    /** @type {number} */
    var digitPatternStart = formattingTemplate.search(this.DIGIT_PATTERN_);
    /** @type {string} */
    var tempTemplate =
        formattingTemplate.replace(this.DIGIT_PATTERN_, nextChar);
    this.formattingTemplate_.clear();
    this.formattingTemplate_.append(tempTemplate);
    this.lastMatchPosition_ = digitPatternStart;
    return tempTemplate.substring(0, this.lastMatchPosition_ + 1);
  } else {
    if (this.possibleFormats_.length == 1) {
      // More digits are entered than we could handle, and there are no other
      // valid patterns to try.
      this.ableToFormat_ = false;
    }  // else, we just reset the formatting pattern.
    this.currentFormattingPattern_ = '';
    return this.accruedInput_.toString();
  }
};
te.length > 0) {
    this.formattingTemplate_.append(tempTemplate);
    return true;
  }
  return false;
};


/**
 * Gets a formatting template which can be used to efficiently format a
 * partial number where digits are added one by one.
 *
 * @param {string} numberPattern
 * @param {string} numberFormat
 * @return {string}
 * @private
 */
i18n.phonenumbers.AsYouTypeFormatter.prototype.getFormattingTemplate_ =
    function(numberPattern, numberFormat) {

  // Creates a phone number consisting only of the digit 9 that matches the
  // numberPattern by applying the pattern to the longestPhoneNumber string.
  /** @type {string} */
  var longestPhoneNumber = '999999999999999';
  /** @type {Array.<string>} */
  var m = longestPhoneNumber.match(numberPattern);
  // this match will always succeed
  /** @type {string} */
  var aPhoneNumber = m[0];
  // No formatting template can be created if the number of digits entered so
  // far is longer than the maximum the current formatting rule can accommodate.
  if (aPhoneNumber.length < this.nationalNumber_.getLength()) {
    return '';
  }
  // Formats the number according to numberFormat
  /** @type {string} */
  var template = aPhoneNumber.replace(new RegExp(numberPattern, 'g'),
                                      numberFormat);
  // Replaces each digit with character DIGIT_PLACEHOLDER
  template = template.replace(new RegExp('9', 'g'), this.DIGIT_PLACEHOLDER_);
  return template;
};


/**
 * Clears the internal state of the formatter, so it can be reused.
 */
i18n.phonenumbers.AsYouTypeFormatter.prototype.clear = function() {
  this.currentOutput_ = '';
  this.accruedInput_.clear();
  this.accruedInputWithoutFormatting_.clear();
  this.formattingTemplate_.clear();
  this.lastMatchPosition_ = 0;
  this.currentFormattingPattern_ = '';
  this.prefixBeforeNationalNumber_.clear();
  this.extractedNationalPrefix_ = '';
  this.nationalNumber_.clear();
  this.ableToFormat_ = true;
  this.inputHasFormatting_ = false;
  this.positionToRemember_ = 0;
  this.originalPosition_ = 0;
  this.isCompleteNumber_ = false;
  this.isExpectingCountryCallingCode_ = false;
  this.possibleFormats_ = [];
  this.shouldAddSpaceAfterNationalPrefix_ = false;
  if (this.currentMetadata_ != this.defaultMetadata_) {
    this.currentMetadata_ = this.getMetadataForRegion_(this.defaultCountry_);
  }
};


/**
 * Formats a phone number on-the-fly as each digit is entered.
 *
 * @param {string} nextChar the most recently entered digit of a phone number.
 *     Formatting characters are allowed, but as soon as they are encountered
 *     this method formats the number as entered and not 'as you type' anymore.
 *     Full width digits and Arabic-indic digits are allowed, and will be shown
 *     as they are.
 * @return {string} the partially formatted phone number.
 */
i18n.phonenumbers.AsYouTypeFormatter.prototype.inputDigit = function(nextChar) {
  this.currentOutput_ =
      this.inputDigitWithOptionToRememberPosition_(nextChar, false);
  return this.currentOutput_;
};


/**
 * Same as {@link #inputDigit}, but remembers the position where
 * {@code nextChar} is inserted, so that it can be retrieved later by using
 * {@link #getRememberedPosition}. The remembered position will be automatically
 * adjusted if additional formatting characters are later inserted/removed in
 * front of {@code nextChar}.
 *
 * @param {string} nextChar
 * @return {string}
 */
i18n.phonenumbers.AsYouTypeFormatter.prototype.inputDigitAndRememberPosition =
    function(nextChar) {

  this.currentOutput_ =
      this.inputDigitWithOptionToRememberPosition_(nextChar, true);
  return this.currentOutput_;
};


/**
 * @param {string} nextChar
 * @param {boolean} rememberPosition
 * @return {string}
 * @private
 */
i18n.phonenumbers.AsYouTypeFormatter.prototype.
    inputDigitWithOptionToRememberPosition_ = function(nextChar,
                                                       rememberPosition) {

  this.accruedInput_.append(nextChar);
  if (rememberPosition) {
    this.originalPosition_ = this.accruedInput_.getLength();
  }
  // We do formatting on-the-fly only when each character entered is either a
  // digit, or a plus sign (accepted at the start of the number only).
  if (!this.isDigitOrLeadingPlusSign_(nextChar)) {
    this.ableToFormat_ = false;
    this.inputHasFormatting_ = true;
  } else {
    nextChar = this.normalizeAndAccrueDigitsAndPlusSign_(nextChar,
                                                         rememberPosition);
  }
  if (!this.ableToFormat_) {
    // When we are unable to format because of reasons other than that
    // formatting chars have been entered, it can be due to really long IDDs or
    // NDDs. If that is the case, we might be able to do formatting again after
    // extracting them.
    if (this.inputHasFormatting_) {
      return this.accruedInput_.toString();
    } else if (this.attemptToExtractIdd_()) {
      if (this.attemptToExtractCountryCallingCode_()) {
        return this.attemptToChoosePatternWithPrefixExtracted_();
      }
    } else if (this.ableToExtractLongerNdd_()) {
      // Add an additional space to separate long NDD and national significant
      // number for readability. We don't set shouldAddSpaceAfterNationalPrefix_
      // to true, since we don't want this to change later when we choose
      // formatting templates.
      this.prefixBeforeNationalNumber_.append(
          i18n.phonenumbers.AsYouTypeFormatter.
          SEPARATOR_BEFORE_NATIONAL_NUMBER_);
      return this.attemptToChoosePatternWithPrefixExtracted_();
    }
    return this.accruedInput_.toString();
  }

  // We start to attempt to format only when at least MIN_LEADING_DIGITS_LENGTH
  // digits (the plus sign is counted as a digit as well for this purpose) have
  // been entered.
  switch (this.accruedInputWithoutFormatting_.getLength()) {
    case 0:
    case 1:
    case 2:
      return this.accruedInput_.toString();
    case 3:
      if (this.attemptToExtractIdd_()) {
        this.isExpectingCountryCallingCode_ = true;
      } else {
        // No IDD or plus sign is found, might be entering in national format.
        this.extractedNationalPrefix_ =
            this.removeNationalPrefixFromNationalNumber_();
        return this.attemptToChooseFormattingPattern_();
      }
    default:
      if (this.isExpectingCountryCallingCode_) {
        if (this.attemptToExtractCountryCallingCode_()) {
          this.isExpectingCountryCallingCode_ = false;
        }
        return this.prefixBeforeNationalNumber_.toString() +
            this.nationalNumber_.toString();
      }
      if (this.possibleFormats_.length > 0) {
        // The formatting patterns are already chosen.
        /** @type {string} */
        var tempNationalNumber = this.inputDigitHelper_(nextChar);
        // See if the accrued digits can be formatted properly already. If not,
        // use the results from inputDigitHelper, which does formatting based on
        // the formatting pattern chosen.
        /** @type {string} */
        var formattedNumber = this.attemptToFormatAccruedDigits_();
        if (formattedNumber.length > 0) {
          return formattedNumber;
        }
        this.narrowDownPossibleFormats_(this.nationalNumber_.toString());
        if (this.maybeCreateNewTemplate_()) {
          return this.inputAccruedNationalNumber_();
        }
        return this.ableToFormat_ ?
            this.appendNationalNumber_(tempNationalNumber) :
            this.accruedInput_.toString();
      } else {
        return this.attemptToChooseFormattingPattern_();
      }
  }
};


/**
 * @return {string}
 * @private
 */
i18n.phonenumbers.AsYouTypeFormatter.prototype.
    attemptToChoosePatternWithPrefixExtracted_ = function() {

  this.ableToFormat_ = true;
  this.isExpectingCountryCallingCode_ = false;
  this.possibleFormats_ = [];
  this.lastMatchPosition_ = 0;
  this.formattingTemplate_.clear();
  this.currentFormattingPattern_ = '';
  return this.attemptToChooseFormattingPattern_();
};


/**
 * @return {string}
 * @private
 */
i18n.phonenumbers.AsYouTypeFormatter.prototype.getExtractedNationalPrefix_ =
    function() {
  return this.extractedNationalPrefix_;
};


/**
 * Some national prefixes are a substring of others. If extracting the shorter
 * NDD doesn't result in a number we can format, we try to see if we can extract
 * a longer version here.
 * @return {boolean}
 * @private
 */
i18n.phonenumbers.AsYouTypeFormatter.prototype.ableToExtractLongerNdd_ =
    function() {
  if (this.extractedNationalPrefix_.length > 0) {
    // Put the extracted NDD back to the national number before attempting to
    // extract a new NDD.
    /** @type {string} */
    var nationalNumberStr = this.nationalNumber_.toString();
    this.nationalNumber_.clear();
    this.nationalNumber_.append(this.extractedNationalPrefix_);
    this.nationalNumber_.append(nationalNumberStr);
    // Remove the previously extracted NDD from prefixBeforeNationalNumber. We
    // cannot simply set it to empty string because people sometimes incorrectly
    // enter national prefix after the country code, e.g. +44 (0)20-1234-5678.
    /** @type {string} */
    var prefixBeforeNationalNumberStr =
        this.prefixBeforeNationalNumber_.toString();
    /** @type {number} */
    var indexOfPreviousNdd = prefixBeforeNationalNumberStr.lastIndexOf(
        this.extractedNationalPrefix_);
    this.prefixBeforeNationalNumber_.clear();
    this.prefixBeforeNationalNumber_.append(
        prefixBeforeNationalNumberStr.substring(0, indexOfPreviousNdd));
  }
  return this.extractedNationalPrefix_ !=
      this.removeNationalPrefixFromNationalNumber_();
};


/**
 * @param {string} nextChar
 * @return {boolean}
 * @private
 */
i18n.phonenumbers.AsYouTypeFormatter.prototype.isDigitOrLeadingPlusSign_ =
    function(nextChar) {
  return i18n.phonenumbers.PhoneNumberUtil.CAPTURING_DIGIT_PATTERN
      .test(nextChar) ||
      (this.accruedInput_.getLength() == 1 &&
       i18n.phonenumbers.PhoneNumberUtil.PLUS_CHARS_PATTERN.test(nextChar));
};


/**
 * Check to see if there is an exact pattern match for these digits. If so, we
 * should use this instead of any other formatting template whose
 * leadingDigitsPattern also matches the input.
 * @return {string}
 * @private
 */
i18n.phonenumbers.AsYouTypeFormatter.prototype.attemptToFormatAccruedDigits_ =
    function() {

  /** @type {string} */
  var nationalNumber = this.nationalNumber_.toString();
  /** @type {number} */
  var possibleFormatsLength = this.possibleFormats_.length;
  for (var i = 0; i < possibleFormatsLength; ++i) {
    /** @type {i18n.phonenumbers.NumberFormat} */
    var numberFormat = this.possibleFormats_[i];
    /** @type {string} */
    var pattern = numberFormat.getPatternOrDefault();
    /** @type {RegExp} */
    var patternRegExp = new RegExp('^(?:' + pattern + ')$');
    if (patternRegExp.test(nationalNumber)) {
      this.shouldAddSpaceAfterNationalPrefix_ =
          i18n.phonenumbers.AsYouTypeFormatter.
          NATIONAL_PREFIX_SEPARATORS_PATTERN_.test(
              numberFormat.getNationalPrefixFormattingRule());
      /** @type {string} */
      var formattedNumber = nationalNumber.replace(new RegExp(pattern, 'g'),
                                                   numberFormat.getFormat());
      return this.appendNationalNumber_(formattedNumber);
    }
  }
  return '';
};


/**
 * Combines the national number with any prefix (IDD/+ and country code or
 * national prefix) that was collected. A space will be inserted between them if
 * the current formatting template indicates this to be suitable.
 * @param {string} nationalNumber The number to be appended.
 * @return {string} The combined number.
 * @private
 */
i18n.phonenumbers.AsYouTypeFormatter.prototype.appendNationalNumber_ =
    function(nationalNumber) {
  /** @type {number} */
  var prefixBeforeNationalNumberLength =
      this.prefixBeforeNationalNumber_.getLength();
  if (this.shouldAddSpaceAfterNationalPrefix_ &&
      prefixBeforeNationalNumberLength > 0 &&
      this.prefixBeforeNationalNumber_.toString().charAt(
          prefixBeforeNationalNumberLength - 1) !=
      i18n.phonenumbers.AsYouTypeFormatter.SEPARATOR_BEFORE_NATIONAL_NUMBER_) {
    // We want to add a space after the national prefix if the national prefix
    // formatting rule indicates that this would normally be done, with the
    // exception of the case where we already appended a space because the NDD
    // was surprisingly long.
    return this.prefixBeforeNationalNumber_ +
        i18n.phonenumbers.AsYouTypeFormatter.SEPARATOR_BEFORE_NATIONAL_NUMBER_ +
        nationalNumber;
  } else {
    return this.prefixBeforeNationalNumber_ + nationalNumber;
  }
};


/**
 * Returns the current position in the partially formatted phone number of the
 * character which was previously passed in as the parameter of
 * {@link #inputDigitAndRememberPosition}.
 *
 * @return {number}
 */
i18n.phonenumbers.AsYouTypeFormatter.prototype.getRememberedPosition =
    function() {

  if (!this.ableToFormat_) {
    return this.originalPosition_;
  }
  /** @type {number} */
  var accruedInputIndex = 0;
  /** @type {number} */
  var currentOutputIndex = 0;
  /** @type {string} */
  var accruedInputWithoutFormatting =
      this.accruedInputWithoutFormatting_.toString();
  /** @type {string} */
  var currentOutput = this.currentOutput_.toString();
  while (accruedInputIndex < this.positionToRemember_ &&
         currentOutputIndex < currentOutput.length) {
    if (accruedInputWithoutFormatting.charAt(accruedInputIndex) ==
        currentOutput.charAt(currentOutputIndex)) {
      accruedInputIndex++;
    }
    currentOutputIndex++;
  }
  return currentOutputIndex;
};


/**
 * Attempts to set the formatting template and returns a string which contains
 * the formatted version of the digits entered so far.
 *
 * @return {string}
 * @private
 */
i18n.phonenumbers.AsYouTypeFormatter.prototype.
    attemptToChooseFormattingPattern_ = function() {

  /** @type {string} */
  var nationalNumber = this.nationalNumber_.toString();
  // We start to attempt to format only when at least MIN_LEADING_DIGITS_LENGTH
  // digits of national number (excluding national prefix) have been entered.
  if (nationalNumber.length >=
      i18n.phonenumbers.AsYouTypeFormatter.MIN_LEADING_DIGITS_LENGTH_) {
    this.getAvailableFormats_(nationalNumber);
    // See if the accrued digits can be formatted properly already.
    var formattedNumber = this.attemptToFormatAccruedDigits_();
    if (formattedNumber.length > 0) {
      return formattedNumber;
    }
    return this.maybeCreateNewTemplate_() ?
        this.inputAccruedNationalNumber_() : this.accruedInput_.toString();
  } else {
    return this.appendNationalNumber_(nationalNumber);
  }
};


/**
 * Invokes inputDigitHelper on each digit of the national number accrued, and
 * returns a formatted string in the end.
 *
 * @return {string}
 * @private
 */
i18n.phonenumbers.AsYouTypeFormatter.prototype.inputAccruedNationalNumber_ =
    function() {

  /** @type {string} */
  var nationalNumber = this.nationalNumber_.toString();
  /** @type {number} */
  var lengthOfNationalNumber = nationalNumber.length;
  if (lengthOfNationalNumber > 0) {
    /** @type {string} */
    var tempNationalNumber = '';
    for (var i = 0; i < lengthOfNationalNumber; i++) {
      tempNationalNumber =
          this.inputDigitHelper_(nationalNumber.charAt(i));
    }
    return this.ableToFormat_ ?
        this.appendNationalNumber_(tempNationalNumber) :
        this.accruedInput_.toString();
  } else {
    return this.prefixBeforeNationalNumber_.toString();
  }
};


/**
 * @return {boolean} true if the current country is a NANPA country and the
 *     national number begins with the national prefix.
 * @private
 */
i18n.phonenumbers.AsYouTypeFormatter.prototype.
    isNanpaNumberWithNationalPrefix_ = function() {
  // For NANPA numbers beginning with 1[2-9], treat the 1 as the national
  // prefix. The reason is that national significant numbers in NANPA always
  // start with [2-9] after the national prefix. Numbers beginning with 1[01]
  // can only be short/emergency numbers, which don't need the national prefix.
  if (this.currentMetadata_.getCountryCode() != 1) {
    return false;
  }
  /** @type {string} */
  var nationalNumber = this.nationalNumber_.toString();
  return (nationalNumber.charAt(0) == '1') &&
      (nationalNumber.charAt(1) != '0') &&
      (nationalNumber.charAt(1) != '1');
};


/**
 * Returns the national prefix extracted, or an empty string if it is not
 * present.
 * @return {string}
 * @private
 */
i18n.phonenumbers.AsYouTypeFormatter.prototype.
    removeNationalPrefixFromNationalNumber_ = function() {

  /** @type {string} */
  var nationalNumber = this.nationalNumber_.toString();
  /** @type {number} */
  var startOfNationalNumber = 0;
  if (this.isNanpaNumberWithNationalPrefix_()) {
    startOfNationalNumber = 1;
    this.prefixBeforeNationalNumber_.append('1').append(
        i18n.phonenumbers.AsYouTypeFormatter.SEPARATOR_BEFORE_NATIONAL_NUMBER_);
    this.isCompleteNumber_ = true;
  } else if (this.currentMetadata_.hasNationalPrefixForParsing()) {
    /** @type {RegExp} */
    var nationalPrefixForParsing = new RegExp(
        '^(?:' + this.currentMetadata_.getNationalPrefixForParsing() + ')');
    /** @type {Array.<string>} */
    var m = nationalNumber.match(nationalPrefixForParsing);
    // Since some national prefix patterns are entirely optional, check that a
    // national prefix could actually be extracted.
    if (m != null && m[0] != null && m[0].length > 0) {
      // When the national prefix is detected, we use international formatting
      // rules instead of national ones, because national formatting rules could
      // contain local formatting rules for numbers entered without area code.
      this.isCompleteNumber_ = true;
      startOfNationalNumber = m[0].length;
      this.prefixBeforeNationalNumber_.append(nationalNumber.substring(0,
          startOfNationalNumber));
    }
  }
  this.nationalNumber_.clear();
  this.nationalNumber_.append(nationalNumber.substring(startOfNationalNumber));
  return nationalNumber.substring(0, startOfNationalNumber);
};


/**
 * Extracts IDD and plus sign to prefixBeforeNationalNumber when they are
 * available, and places the remaining input into nationalNumber.
 *
 * @return {boolean} true when accruedInputWithoutFormatting begins with the
 *     plus sign or valid IDD for defaultCountry.
 * @private
 */
i18n.phonenumbers.AsYouTypeFormatter.prototype.attemptToExtractIdd_ =
    function() {

  /** @type {string} */
  var accruedInputWithoutFormatting =
      this.accruedInputWithoutFormatting_.toString();
  /** @type {RegExp} */
  var internationalPrefix = new RegExp(
      '^(?:' + '\\' + i18n.phonenumbers.PhoneNumberUtil.PLUS_SIGN + '|' +
      this.currentMetadata_.getInternationalPrefix() + ')');
  /** @type {Array.<string>} */
  var m = accruedInputWithoutFormatting.match(internationalPrefix);
  if (m != null && m[0] != null && m[0].length > 0) {
    this.isCompleteNumber_ = true;
    /** @type {number} */
    var startOfCountryCallingCode = m[0].length;
    this.nationalNumber_.clear();
    this.nationalNumber_.append(
        accruedInputWithoutFormatting.substring(startOfCountryCallingCode));
    this.prefixBeforeNationalNumber_.clear();
    this.prefixBeforeNationalNumber_.append(
        accruedInputWithoutFormatting.substring(0, startOfCountryCallingCode));
    if (accruedInputWithoutFormatting.charAt(0) !=
        i18n.phonenumbers.PhoneNumberUtil.PLUS_SIGN) {
      this.prefixBeforeNationalNumber_.append(
          i18n.phonenumbers.AsYouTypeFormatter.
          SEPARATOR_BEFORE_NATIONAL_NUMBER_);
    }
    return true;
  }
  return false;
};


/**
 * Extracts the country calling code from the beginning of nationalNumber to
 * prefixBeforeNationalNumber when they are available, and places the remaining
 * input into nationalNumber.
 *
 * @return {boolean} true when a valid country calling code can be found.
 * @private
 */
i18n.phonenumbers.AsYouTypeFormatter.prototype.
    attemptToExtractCountryCallingCode_ = function() {

  if (this.nationalNumber_.getLength() == 0) {
    return false;
  }
  /** @type {!goog.string.StringBuffer} */
  var numberWithoutCountryCallingCode = new goog.string.StringBuffer();
  /** @type {number} */
  var countryCode = this.phoneUtil_.extractCountryCode(
      this.nationalNumber_, numberWithoutCountryCallingCode);
  if (countryCode == 0) {
    return false;
  }
  this.nationalNumber_.clear();
  this.nationalNumber_.append(numberWithoutCountryCallingCode.toString());
  /** @type {string} */
  var newRegionCode = this.phoneUtil_.getRegionCodeForCountryCode(countryCode);
  if (i18n.phonenumbers.PhoneNumberUtil.REGION_CODE_FOR_NON_GEO_ENTITY ==
      newRegionCode) {
    this.currentMetadata_ =
        this.phoneUtil_.getMetadataForNonGeographicalRegion(countryCode);
  } else if (newRegionCode != this.defaultCountry_) {
    this.currentMetadata_ = this.getMetadataForRegion_(newRegionCode);
  }
  /** @type {string} */
  var countryCodeString = '' + countryCode;
  this.prefixBeforeNationalNumber_.append(countryCodeString).append(
      i18n.phonenumbers.AsYouTypeFormatter.SEPARATOR_BEFORE_NATIONAL_NUMBER_);
  // When we have successfully extracted the IDD, the previously extracted NDD
  // should be cleared because it is no longer valid.
  this.extractedNationalPrefix_ = '';
  return true;
};


/**
 * Accrues digits and the plus sign to accruedInputWithoutFormatting for later
 * use. If nextChar contains a digit in non-ASCII format (e.g. the full-width
 * version of digits), it is first normalized to the ASCII version. The return
 * value is nextChar itself, or its normalized version, if nextChar is a digit
 * in non-ASCII format. This method assumes its input is either a digit or the
 * plus sign.
 *
 * @param {string} nextChar
 * @param {boolean} rememberPosition
 * @return {string}
 * @private
 */
i18n.phonenumbers.AsYouTypeFormatter.prototype.
    normalizeAndAccrueDigitsAndPlusSign_ = function(nextChar,
                                                    rememberPosition) {

  /** @type {string} */
  var normalizedChar;
  if (nextChar == i18n.phonenumbers.PhoneNumberUtil.PLUS_SIGN) {
    normalizedChar = nextChar;
    this.accruedInputWithoutFormatting_.append(nextChar);
  } else {
    normalizedChar = i18n.phonenumbers.PhoneNumberUtil.DIGIT_MAPPINGS[nextChar];
    this.accruedInputWithoutFormatting_.append(normalizedChar);
    this.nationalNumber_.append(normalizedChar);
  }
  if (rememberPosition) {
    this.positionToRemember_ = this.accruedInputWithoutFormatting_.getLength();
  }
  return normalizedChar;
};


/**
 * @param {string} nextChar
 * @return {string}
 * @private
 */
i18n.phonenumbers.AsYouTypeFormatter.prototype.inputDigitHelper_ =
    function(nextChar) {

  // Note that formattingTemplate is not guaranteed to have a value, it could be
  // empty, e.g. when the next digit is entered after extracting an IDD or NDD.
  /** @type {string} */
  var formattingTemplate = this.formattingTemplate_.toString();
  if (formattingTemplate.substring(this.lastMatchPosition_)
      .search(this.DIGIT_PATTERN_) >= 0) {
    /** @type {number} */
    var digitPatternStart = formattingTemplate.search(this.DIGIT_PATTERN_);
    /** @type {string} */
    var tempTemplate =
        formattingTemplate.replace(this.DIGIT_PATTERN_, nextChar);
    this.formattingTemplate_.clear();
    this.formattingTemplate_.append(tempTemplate);
    this.lastMatchPosition_ = digitPatternStart;
    return tempTemplate.substring(0, this.lastMatchPosition_ + 1);
  } else {
    if (this.possibleFormats_.length == 1) {
      // More digits are entered than we could handle, and there are no other
      // valid patterns to try.
      this.ableToFormat_ = false;
    }  // else, we just reset the formatting pattern.
    this.currentFormattingPattern_ = '';
    return this.accruedInput_.toString();
  }
};
