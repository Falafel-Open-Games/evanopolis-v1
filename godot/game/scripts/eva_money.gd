# ---
# summary: Formats authoritative integer micro-EVA amounts for presentation.
# ---
class_name EvaMoney
extends RefCounted

const MicroPerEva: int = 1_000_000


static func format_micro(amount_micro: int) -> String:
    var negative: bool = amount_micro < 0
    var absolute_micro: int = absi(amount_micro)
    var whole_eva: int = absolute_micro / MicroPerEva
    var fractional_micro: int = absolute_micro % MicroPerEva
    var formatted: String = str(whole_eva)
    if fractional_micro != 0:
        var fractional_text: String = "%06d" % fractional_micro
        formatted += "." + fractional_text.rstrip("0")
    return ("-" if negative else "") + formatted


static func fractional_digits(amount_micro: int) -> int:
    var fractional_text: String = "%06d" % (absi(amount_micro) % MicroPerEva)
    return fractional_text.rstrip("0").length()


static func format_micro_padded(amount_micro: int, fractional_width: int) -> String:
    assert(fractional_width >= 0 and fractional_width <= 6)
    var negative: bool = amount_micro < 0
    var absolute_micro: int = absi(amount_micro)
    var whole_eva: int = absolute_micro / MicroPerEva
    var formatted: String = str(whole_eva)
    if fractional_width > 0:
        var six_digit_fraction: String = "%06d" % (absolute_micro % MicroPerEva)
        formatted += "." + six_digit_fraction.left(fractional_width)
    return ("-" if negative else "") + formatted


static func required_micro(source: Dictionary, field: String) -> int:
    assert(field.ends_with("_micro"))
    assert(source.has(field), "Missing required micro-EVA field: %s" % field)
    return int(source[field])


static func multiply_ratio(amount_micro: int, numerator: int, denominator: int) -> int:
    assert(denominator > 0)
    assert((amount_micro * numerator) % denominator == 0)
    return (amount_micro * numerator) / denominator
