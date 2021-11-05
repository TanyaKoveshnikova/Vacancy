#!/usr/bin/env python3
data = open('baza.txt').read().splitlines()

#data = ['_+=+_ssssss_+=+_']


file = open('prof_data.txt', 'w')
file.write('var dict_prof_names = {\n')
count_lines = 0


for line in data:
	if line[:5] == '_+=+_' and line[-5:] == '_+=+_':
		if count_lines != 0:
			file.write("],\n")
		count_lines += 1
		file.write("	'" + line[5:-5] + "': [")
	else: 
		names = line.split('/')
		for name in names:
			file.write("'" + name + "', ")				

file.write('\n}')

		