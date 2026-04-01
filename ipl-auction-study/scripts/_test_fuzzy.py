from fuzzywuzzy import fuzz

pairs = [
    ('Gautam Gambhir','G Gambhir'),
    ('Ben Stokes','BA Stokes'),
    ('Kevin Pietersen','KP Pietersen'),
    ('Kieron Pollard','KA Pollard'),
    ('Shane Watson','SR Watson'),
    ('Pat Cummins','PJ Cummins'),
    ('Chris Morris','CH Morris'),
    ('Sam Curran','SM Curran'),
    ('Mitchell Starc','MA Starc'),
    ('Rishabh Pant','RR Pant'),
    ('Glenn Maxwell','GJ Maxwell'),
    ('Ravindra Jadeja','RA Jadeja'),
    ('Jaydev Unadkat','JD Unadkat'),
    ('Ishan Kishan','Ishan Kishan'),
    ('MS Dhoni','MS Dhoni'),
]

lines = []
for a, b in pairs:
    ts = fuzz.token_sort_ratio(a, b)
    pr = fuzz.partial_ratio(a, b)
    lines.append(f"{ts:3d} {pr:3d} | {a} -> {b}")

with open("_fuzzy_results.txt", "w") as f:
    f.write("\n".join(lines))

print("Done - see _fuzzy_results.txt")
