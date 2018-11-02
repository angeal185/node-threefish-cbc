
int64 = function(low, high) {
  this.low_ = low | 0;  // force into 32 signed bits.
  this.high_ = high | 0;  // force into 32 signed bits.
};

int64.IntCache_ = {};

int64.fromBytes = function(b0, b1, b2, b3, b4, b5, b6, b7){
    return new int64(((b4 & 0xFF) << 24) | ((b5 & 0xFF) << 16) | ((b6 & 0xFF) << 8) | (b7 & 0xFF), ((b0 & 0xFF) << 24) | ((b1 & 0xFF) << 16) | ((b2 & 0xFF) << 8) | (b3 & 0xFF));
}

int64.prototype.toBytes = function(){
    var b0 = (this.high_ >>> 24) & 0xFF;
    var b1 = (this.high_ >>> 16) & 0xFF;
    var b2 = (this.high_ >>> 8) & 0xFF;
    var b3 = (this.high_ >>> 0) & 0xFF;
    var b4 = (this.low_ >>> 24) & 0xFF;
    var b5 = (this.low_ >>> 16) & 0xFF;
    var b6 = (this.low_ >>> 8) & 0xFF;
    var b7 = (this.low_ >>> 0) & 0xFF;
    return [b0, b1, b2, b3, b4, b5, b6, b7];
}

int64.fromInt = function(value) {
  if (-128 <= value && value < 128) {
    var cachedObj = int64.IntCache_[value];
    if (cachedObj) {
      return cachedObj;
    }
  }

  var obj = new int64(value | 0, value < 0 ? -1 : 0);
  if (-128 <= value && value < 128) {
    int64.IntCache_[value] = obj;
  }
  return obj;
};

int64.fromNumber = function(value) {
  if (isNaN(value) || !isFinite(value)) {
    return int64.ZERO;
  } else if (value <= -int64.TWO_PWR_63_DBL_) {
    return int64.MIN_VALUE;
  } else if (value + 1 >= int64.TWO_PWR_63_DBL_) {
    return int64.MAX_VALUE;
  } else if (value < 0) {
    return int64.fromNumber(-value).negate();
  } else {
    return new int64(
        (value % int64.TWO_PWR_32_DBL_) | 0,
        (value / int64.TWO_PWR_32_DBL_) | 0);
  }
};

int64.fromBits = function(lowBits, highBits) {
  return new int64(lowBits, highBits);
};

int64.fromString = function(str, opt_radix) {
  if (str.length == 0) {
    throw Error('number format error: empty string');
  }

  var radix = opt_radix || 10;
  if (radix < 2 || 36 < radix) {
    throw Error('radix out of range: ' + radix);
  }

  if (str.charAt(0) == '-') {
    return int64.fromString(str.substring(1), radix).negate();
  } else if (str.indexOf('-') >= 0) {
    throw Error('number format error: interior "-" character: ' + str);
  }

  var radixToPower = int64.fromNumber(Math.pow(radix, 8));
  var result = int64.ZERO;
  for (var i = 0; i < str.length; i += 8) {
    var size = Math.min(8, str.length - i);
    var value = parseInt(str.substring(i, i + size), radix);
    if (size < 8) {
      var power = int64.fromNumber(Math.pow(radix, size));
      result = result.multiply(power).add(int64.fromNumber(value));
    } else {
      result = result.multiply(radixToPower);
      result = result.add(int64.fromNumber(value));
    }
  }
  return result;
};


int64.TWO_PWR_16_DBL_ = 1 << 16;
int64.TWO_PWR_24_DBL_ = 1 << 24;
int64.TWO_PWR_32_DBL_ = int64.TWO_PWR_16_DBL_ * int64.TWO_PWR_16_DBL_;
int64.TWO_PWR_31_DBL_ = int64.TWO_PWR_32_DBL_ / 2;
int64.TWO_PWR_48_DBL_ = int64.TWO_PWR_32_DBL_ * int64.TWO_PWR_16_DBL_;
int64.TWO_PWR_64_DBL_ = int64.TWO_PWR_32_DBL_ * int64.TWO_PWR_32_DBL_;
int64.TWO_PWR_63_DBL_ = int64.TWO_PWR_64_DBL_ / 2;
int64.ZERO = int64.fromInt(0);
int64.ONE = int64.fromInt(1);
int64.NEG_ONE = int64.fromInt(-1);
int64.MAX_VALUE = int64.fromBits(0xFFFFFFFF | 0, 0x7FFFFFFF | 0);
int64.MIN_VALUE = int64.fromBits(0, 0x80000000 | 0);
int64.TWO_PWR_24_ = int64.fromInt(1 << 24);

int64.prototype.toInt = function() {
  return this.low_;
};

int64.prototype.toNumber = function() {
  return this.high_ * int64.TWO_PWR_32_DBL_ +
         this.getLowBitsUnsigned();
};

int64.prototype.toString = function(opt_radix) {
  var radix = opt_radix || 10;
  if (radix < 2 || 36 < radix) {
    throw Error('radix out of range: ' + radix);
  }

  if (this.isZero()) {
    return '0';
  }

  if (this.isNegative()) {
    if (this.equals(int64.MIN_VALUE)) {

      var radixLong = int64.fromNumber(radix);
      var div = this.div(radixLong);
      var rem = div.multiply(radixLong).subtract(this);
      return div.toString(radix) + rem.toInt().toString(radix);
    } else {
      return '-' + this.negate().toString(radix);
    }
  }

  var radixToPower = int64.fromNumber(Math.pow(radix, 6));
  var rem = this;
  var result = '';
  while (true) {
    var remDiv = rem.div(radixToPower);
    var intval = rem.subtract(remDiv.multiply(radixToPower)).toInt();
    var digits = intval.toString(radix);

    rem = remDiv;
    if (rem.isZero()) {
      return digits + result;
    } else {
      while (digits.length < 6) {
        digits = '0' + digits;
      }
      result = '' + digits + result;
    }
  }
};

int64.prototype.getHighBits = function() {
  return this.high_;
};

int64.prototype.getLowBits = function() {
  return this.low_;
};

int64.prototype.getLowBitsUnsigned = function() {
  return (this.low_ >= 0) ?
      this.low_ : int64.TWO_PWR_32_DBL_ + this.low_;
};

int64.prototype.getNumBitsAbs = function() {
  if (this.isNegative()) {
    if (this.equals(int64.MIN_VALUE)) {
      return 64;
    } else {
      return this.negate().getNumBitsAbs();
    }
  } else {
    var val = this.high_ != 0 ? this.high_ : this.low_;
    for (var bit = 31; bit > 0; bit--) {
      if ((val & (1 << bit)) != 0) {
        break;
      }
    }
    return this.high_ != 0 ? bit + 33 : bit + 1;
  }
};

int64.prototype.isZero = function() {
  return this.high_ == 0 && this.low_ == 0;
};

int64.prototype.isNegative = function() {
  return this.high_ < 0;
};

int64.prototype.isOdd = function() {
  return (this.low_ & 1) == 1;
};

int64.prototype.equals = function(other) {
  return (this.high_ == other.high_) && (this.low_ == other.low_);
};

int64.prototype.notEquals = function(other) {
  return (this.high_ != other.high_) || (this.low_ != other.low_);
};

int64.prototype.lessThan = function(other) {
  return this.compare(other) < 0;
};

int64.prototype.lessThanOrEqual = function(other) {
  return this.compare(other) <= 0;
};

int64.prototype.greaterThan = function(other) {
  return this.compare(other) > 0;
};

int64.prototype.greaterThanOrEqual = function(other) {
  return this.compare(other) >= 0;
};

int64.prototype.compare = function(other) {
  if (this.equals(other)) {
    return 0;
  }

  var thisNeg = this.isNegative();
  var otherNeg = other.isNegative();
  if (thisNeg && !otherNeg) {
    return -1;
  }
  if (!thisNeg && otherNeg) {
    return 1;
  }

  if (this.subtract(other).isNegative()) {
    return -1;
  } else {
    return 1;
  }
};

int64.prototype.negate = function() {
  if (this.equals(int64.MIN_VALUE)) {
    return int64.MIN_VALUE;
  } else {
    return this.not().add(int64.ONE);
  }
};

int64.prototype.add = function(other) {

  var a48 = this.high_ >>> 16;
  var a32 = this.high_ & 0xFFFF;
  var a16 = this.low_ >>> 16;
  var a00 = this.low_ & 0xFFFF;

  var b48 = other.high_ >>> 16;
  var b32 = other.high_ & 0xFFFF;
  var b16 = other.low_ >>> 16;
  var b00 = other.low_ & 0xFFFF;

  var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
  c00 += a00 + b00;
  c16 += c00 >>> 16;
  c00 &= 0xFFFF;
  c16 += a16 + b16;
  c32 += c16 >>> 16;
  c16 &= 0xFFFF;
  c32 += a32 + b32;
  c48 += c32 >>> 16;
  c32 &= 0xFFFF;
  c48 += a48 + b48;
  c48 &= 0xFFFF;
  return int64.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
};

int64.prototype.subtract = function(other) {
  return this.add(other.negate());
};

int64.prototype.multiply = function(other) {
  if (this.isZero()) {
    return int64.ZERO;
  } else if (other.isZero()) {
    return int64.ZERO;
  }

  if (this.equals(int64.MIN_VALUE)) {
    return other.isOdd() ? int64.MIN_VALUE : int64.ZERO;
  } else if (other.equals(int64.MIN_VALUE)) {
    return this.isOdd() ? int64.MIN_VALUE : int64.ZERO;
  }

  if (this.isNegative()) {
    if (other.isNegative()) {
      return this.negate().multiply(other.negate());
    } else {
      return this.negate().multiply(other).negate();
    }
  } else if (other.isNegative()) {
    return this.multiply(other.negate()).negate();
  }

  if (this.lessThan(int64.TWO_PWR_24_) &&
      other.lessThan(int64.TWO_PWR_24_)) {
    return int64.fromNumber(this.toNumber() * other.toNumber());
  }

  var a48 = this.high_ >>> 16;
  var a32 = this.high_ & 0xFFFF;
  var a16 = this.low_ >>> 16;
  var a00 = this.low_ & 0xFFFF;

  var b48 = other.high_ >>> 16;
  var b32 = other.high_ & 0xFFFF;
  var b16 = other.low_ >>> 16;
  var b00 = other.low_ & 0xFFFF;

  var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
  c00 += a00 * b00;
  c16 += c00 >>> 16;
  c00 &= 0xFFFF;
  c16 += a16 * b00;
  c32 += c16 >>> 16;
  c16 &= 0xFFFF;
  c16 += a00 * b16;
  c32 += c16 >>> 16;
  c16 &= 0xFFFF;
  c32 += a32 * b00;
  c48 += c32 >>> 16;
  c32 &= 0xFFFF;
  c32 += a16 * b16;
  c48 += c32 >>> 16;
  c32 &= 0xFFFF;
  c32 += a00 * b32;
  c48 += c32 >>> 16;
  c32 &= 0xFFFF;
  c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48;
  c48 &= 0xFFFF;
  return int64.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
};

int64.prototype.div = function(other) {
  if (other.isZero()) {
    throw Error('division by zero');
  } else if (this.isZero()) {
    return int64.ZERO;
  }

  if (this.equals(int64.MIN_VALUE)) {
    if (other.equals(int64.ONE) ||
        other.equals(int64.NEG_ONE)) {
      return int64.MIN_VALUE;
    } else if (other.equals(int64.MIN_VALUE)) {
      return int64.ONE;
    } else {
      var halfThis = this.shiftRight(1);
      var approx = halfThis.div(other).shiftLeft(1);
      if (approx.equals(int64.ZERO)) {
        return other.isNegative() ? int64.ONE : int64.NEG_ONE;
      } else {
        var rem = this.subtract(other.multiply(approx));
        var result = approx.add(rem.div(other));
        return result;
      }
    }
  } else if (other.equals(int64.MIN_VALUE)) {
    return int64.ZERO;
  }

  if (this.isNegative()) {
    if (other.isNegative()) {
      return this.negate().div(other.negate());
    } else {
      return this.negate().div(other).negate();
    }
  } else if (other.isNegative()) {
    return this.div(other.negate()).negate();
  }

  var res = int64.ZERO;
  var rem = this;
  while (rem.greaterThanOrEqual(other)) {
    var approx = Math.max(1, Math.floor(rem.toNumber() / other.toNumber()));
    var log2 = Math.ceil(Math.log(approx) / Math.LN2);
    var delta = (log2 <= 48) ? 1 : Math.pow(2, log2 - 48);
    var approxRes = int64.fromNumber(approx);
    var approxRem = approxRes.multiply(other);
    while (approxRem.isNegative() || approxRem.greaterThan(rem)) {
      approx -= delta;
      approxRes = int64.fromNumber(approx);
      approxRem = approxRes.multiply(other);
    }

    if (approxRes.isZero()) {
      approxRes = int64.ONE;
    }

    res = res.add(approxRes);
    rem = rem.subtract(approxRem);
  }
  return res;
};

int64.prototype.modulo = function(other) {
  return this.subtract(this.div(other).multiply(other));
};

int64.prototype.not = function() {
  return int64.fromBits(~this.low_, ~this.high_);
};

int64.prototype.and = function(other) {
  return int64.fromBits(this.low_ & other.low_,
                                 this.high_ & other.high_);
};

int64.prototype.or = function(other) {
  return int64.fromBits(this.low_ | other.low_,
                                 this.high_ | other.high_);
};

int64.prototype.xor = function(other) {
  return int64.fromBits(this.low_ ^ other.low_,
                                 this.high_ ^ other.high_);
};

int64.prototype.shiftLeft = function(numBits) {
  numBits &= 63;
  if (numBits == 0) {
    return this;
  } else {
    var low = this.low_;
    if (numBits < 32) {
      var high = this.high_;
      return int64.fromBits(
          low << numBits,
          (high << numBits) | (low >>> (32 - numBits)));
    } else {
      return int64.fromBits(0, low << (numBits - 32));
    }
  }
};

int64.prototype.shiftRight = function(numBits) {
  numBits &= 63;
  if (numBits == 0) {
    return this;
  } else {
    var high = this.high_;
    if (numBits < 32) {
      var low = this.low_;
      return int64.fromBits(
          (low >>> numBits) | (high << (32 - numBits)),
          high >> numBits);
    } else {
      return int64.fromBits(
          high >> (numBits - 32),
          high >= 0 ? 0 : -1);
    }
  }
};

int64.prototype.shiftRightUnsigned = function(numBits) {
  numBits &= 63;
  if (numBits == 0) {
    return this;
  } else {
    var high = this.high_;
    if (numBits < 32) {
      var low = this.low_;
      return int64.fromBits(
          (low >>> numBits | (high << (32 - numBits))),
          high >>> numBits);
    } else if (numBits == 32) {
      return int64.fromBits(high, 0);
    } else {
      return int64.fromBits(high >>> (numBits - 32), 0);
    }
  }
};

module.exports = int64;
