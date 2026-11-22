export interface Formula {
  id: string
  category: string
  name: string
  expression: string
  variables: string
  units: string
  example: string
  shortcut?: string
  levelId: string
}

export const formulaCategories = [
  'Speed, distance & time', 'Percentage', 'Average', 'Ratio', 'Proportion',
  'Fuel', 'Rate & work', 'Geometry', 'Trigonometry', 'Conversions',
]

export const formulas: Formula[] = [
  { id: 'speed', category: 'Speed, distance & time', name: 'Speed', expression: 'Speed = Distance ÷ Time', variables: 'Speed = rate of travel; Distance = length covered; Time = duration', units: 'km/h, m/s, knots', example: '240 km in 3 h → 240 ÷ 3 = 80 km/h', shortcut: 'Cover the letter you need in the formula triangle.', levelId: 'speed-1' },
  { id: 'distance', category: 'Speed, distance & time', name: 'Distance', expression: 'Distance = Speed × Time', variables: 'Speed = rate; Time = duration', units: 'km, m, nautical miles', example: '90 kt for 2 h → 180 nm', levelId: 'speed-2' },
  { id: 'time', category: 'Speed, distance & time', name: 'Time', expression: 'Time = Distance ÷ Speed', variables: 'Distance = length; Speed = rate', units: 'hours, seconds', example: '300 km at 75 km/h → 4 h', levelId: 'speed-3' },
  { id: 'relative-speed', category: 'Speed, distance & time', name: 'Relative speed', expression: 'Same direction: S₁ − S₂ · Opposite: S₁ + S₂', variables: 'S₁, S₂ = the two speeds', units: 'km/h, knots', example: '80 km/h and 60 km/h opposite → 140 km/h', levelId: 'speed-10' },
  { id: 'average-speed', category: 'Speed, distance & time', name: 'Average speed', expression: 'Average speed = Total distance ÷ Total time', variables: 'Totals include every leg of the journey', units: 'km/h, knots', example: '60 km/h for 2 h + 90 km/h for 1 h → 210 ÷ 3 = 70 km/h', shortcut: 'Never average the speeds directly unless the times are equal.', levelId: 'speed-11' },
  { id: 'pct-of', category: 'Percentage', name: 'Percentage of a number', expression: 'Part = (Percent ÷ 100) × Whole', variables: 'Part = result; Whole = original amount', units: 'same as the whole', example: '15% of 240 → 0.15 × 240 = 36', shortcut: '10% + 5% for 15%.', levelId: 'percentages-6' },
  { id: 'pct-change', category: 'Percentage', name: 'Percentage change', expression: 'Change % = (New − Original) ÷ Original × 100', variables: 'New = final value; Original = starting value', units: 'percent', example: '200 → 250: 50 ÷ 200 × 100 = 25%', levelId: 'percentages-8' },
  { id: 'reverse-pct', category: 'Percentage', name: 'Reverse percentage', expression: 'Original = Final ÷ (1 ± rate)', variables: 'rate = percentage as a decimal', units: 'same as final', example: 'After +20%: 240 ÷ 1.2 = 200', levelId: 'percentages-10' },
  { id: 'average', category: 'Average', name: 'Mean', expression: 'Average = Sum of values ÷ Number of values', variables: 'Sum = total of all observations', units: 'same as the values', example: '(12 + 18 + 24) ÷ 3 = 18', levelId: 'averages-1' },
  { id: 'combined-average', category: 'Average', name: 'Combined average', expression: 'Combined = (n₁a₁ + n₂a₂) ÷ (n₁ + n₂)', variables: 'n = group size; a = group average', units: 'same as values', example: '(10×40 + 20×70) ÷ 30 = 60', levelId: 'averages-3' },
  { id: 'ratio-share', category: 'Ratio', name: 'Share by a ratio', expression: 'Share = Total × parts ÷ sum of parts', variables: 'parts = the portion you need', units: 'same as total', example: '600 in 2:3 → 600 × 3/5 = 360', levelId: 'ratio-3' },
  { id: 'direct-proportion', category: 'Proportion', name: 'Direct proportion', expression: 'a₁ ÷ b₁ = a₂ ÷ b₂', variables: 'a, b = paired quantities increasing together', units: 'context dependent', example: '5 items cost 150 → 8 items cost 240', levelId: 'ratio-4' },
  { id: 'inverse-proportion', category: 'Proportion', name: 'Inverse proportion', expression: 'a₁b₁ = a₂b₂', variables: 'One quantity rises as the other falls', units: 'context dependent', example: '4 workers × 12 days = 6 workers × 8 days', levelId: 'ratio-5' },
  { id: 'fuel-burn', category: 'Fuel', name: 'Fuel used', expression: 'Fuel used = Burn rate × Time', variables: 'Burn rate = fuel per hour', units: 'kg, L, kg/h, L/h', example: '60 kg/h × 1.5 h = 90 kg', levelId: 'fuel-work-1' },
  { id: 'fuel-remaining', category: 'Fuel', name: 'Fuel remaining', expression: 'Remaining = Start − (Burn rate × Time)', variables: 'Start = fuel at departure', units: 'kg or L', example: '400 − 60×2 = 280 kg', levelId: 'fuel-work-4' },
  { id: 'fuel-distance', category: 'Fuel', name: 'Distance-based fuel', expression: 'Fuel = (Rate per 100 km × Distance) ÷ 100', variables: 'Rate = consumption per 100 km', units: 'L', example: '6 L/100 km × 250 km = 15 L', levelId: 'fuel-work-3' },
  { id: 'work-rate', category: 'Rate & work', name: 'Combined work', expression: 'Time together = 1 ÷ (1/t₁ + 1/t₂ + …)', variables: 't = time each worker takes alone', units: 'hours, days', example: '6 h and 3 h → 1 ÷ (1/6 + 1/3) = 2 h', levelId: 'fuel-work-6' },
  { id: 'unitary', category: 'Rate & work', name: 'Unitary method', expression: 'Value of many = (Value of one) × quantity', variables: 'Find one unit first', units: 'context dependent', example: '8 items cost 120 → 15 cost 225', levelId: 'unitary-2' },
  { id: 'rectangle-area', category: 'Geometry', name: 'Rectangle area', expression: 'Area = length × width', variables: 'length, width = side lengths', units: 'cm², m²', example: '12 × 8 = 96 m²', levelId: 'geometry-2' },
  { id: 'triangle-area', category: 'Geometry', name: 'Triangle area', expression: 'Area = ½ × base × height', variables: 'height is perpendicular to the base', units: 'cm², m²', example: '½ × 14 × 8 = 56 m²', levelId: 'geometry-3' },
  { id: 'circumference', category: 'Geometry', name: 'Circle circumference', expression: 'C = 2πr = πd', variables: 'r = radius; d = diameter', units: 'cm, m', example: 'r = 5 → 2 × 3.14 × 5 = 31.4 cm', levelId: 'geometry-4' },
  { id: 'circle-area', category: 'Geometry', name: 'Circle area', expression: 'A = πr²', variables: 'r = radius', units: 'cm², m²', example: 'r = 5 → 3.14 × 25 = 78.5 cm²', levelId: 'geometry-5' },
  { id: 'volume', category: 'Geometry', name: 'Cuboid volume', expression: 'V = length × width × height', variables: 'all three dimensions', units: 'cm³, m³', example: '4 × 3 × 2 = 24 m³', levelId: 'geometry-6' },
  { id: 'pythagoras', category: 'Trigonometry', name: 'Pythagoras', expression: 'a² + b² = c²', variables: 'c = hypotenuse; a, b = shorter sides', units: 'any length unit', example: '3² + 4² = 5²', levelId: 'trigonometry-6' },
  { id: 'sine', category: 'Trigonometry', name: 'Sine', expression: 'sin θ = opposite ÷ hypotenuse', variables: 'θ = angle; sides of a right triangle', units: 'ratio', example: 'opposite 6, hypotenuse 10 → 0.6', levelId: 'trigonometry-2' },
  { id: 'cosine', category: 'Trigonometry', name: 'Cosine', expression: 'cos θ = adjacent ÷ hypotenuse', variables: 'θ = angle; sides of a right triangle', units: 'ratio', example: 'adjacent 8, hypotenuse 10 → 0.8', levelId: 'trigonometry-3' },
  { id: 'tangent', category: 'Trigonometry', name: 'Tangent', expression: 'tan θ = opposite ÷ adjacent', variables: 'θ = angle; sides of a right triangle', units: 'ratio', example: 'opposite 3, adjacent 4 → 0.75', levelId: 'trigonometry-4' },
  { id: 'kmh-ms', category: 'Conversions', name: 'km/h to m/s', expression: 'm/s = km/h ÷ 3.6', variables: 'speed in kilometres per hour', units: 'm/s', example: '72 km/h = 20 m/s', shortcut: 'Divide by 36 then shift, or divide by 4 for a rough check.', levelId: 'speed-6' },
  { id: 'ms-kmh', category: 'Conversions', name: 'm/s to km/h', expression: 'km/h = m/s × 3.6', variables: 'speed in metres per second', units: 'km/h', example: '15 m/s = 54 km/h', levelId: 'speed-7' },
  { id: 'nm-km', category: 'Conversions', name: 'Nautical miles to km', expression: 'km = nm × 1.852', variables: 'nm = nautical miles', units: 'km', example: '10 nm = 18.52 km', levelId: 'speed-9' },
  { id: 'minutes-hours', category: 'Conversions', name: 'Minutes to hours', expression: 'Hours = Minutes ÷ 60', variables: 'minutes = duration', units: 'hours', example: '45 min = 0.75 h', levelId: 'speed-5' },
]
