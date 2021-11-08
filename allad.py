import csv


str = ['Интернет маркетинг', 'Digital marketing', 'Контекстная реклама', 'Яндекс.Директ', 'SEO', 'Бизнес анализ', 'Изучение рынка', 'Маркетинговая стратегия', 'Google']
counter = 0
with open("filtredbaza.csv", encoding='utf-8') as r_file:
    file_reader = csv.reader(r_file, delimiter = ",")
    for row in file_reader:
        for i in range(len(str)):
            if row[0] == str[i].lower():
                counter = counter + int(row[1])
    print(counter)

with open("filtredbazaAnal.csv", encoding='utf-8') as r_file:
    file_reader = csv.reader(r_file, delimiter = ",")
    for row in file_reader:
        for i in range(len(str)):
            if row[0] == str[i].lower():
                counter = counter + int(row[1])
    print(counter)

print(counter)

