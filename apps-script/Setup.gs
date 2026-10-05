/**
 * HE Venue Explorer - workbook builder
 *
 * Run buildWorkbook() from the Apps Script editor. It creates or restyles
 * every tab, applies formatting and dropdowns, and turns on the Search
 * checkboxes. Running it again keeps the venue data and settings already in
 * the workbook; SETUP_DATA is only used for tabs that are empty.
 */

const SETUP_DATA = {"specs": [["Science Education Complex A", "SEC A", "Ground Floor", "Sec A 116", "", "Classroom", "LCD & Screen", "Yes", 50, ""], ["Science Education Complex A", "SEC A", "Ground Floor", "Sec A 117", "SEC A 117", "Classroom", "LCD & Screen", "Yes", 50, ""], ["Science Education Complex A", "SEC A", "Ground Floor", "Sec A 118", "SEC A 118", "Classroom", "LCD & Screen", "Yes", 50, ""], ["Science Education Complex A", "SEC A", "Ground Floor", "Sec A 123", "SEC A 123", "Classroom", "LCD & Screen", "Yes", 50, ""], ["Science Education Complex A", "SEC A", "Ground Floor", "Sec A 124", "SEC A 124", "Classroom", "LCD & Screen", "Yes", 50, ""], ["Science Education Complex A", "SEC A", "Ground Floor", "Escaler Hall", "Escaler Hall", "Lecture Hall", "LCD, screen, mics, computer, clicker", "Yes", 250, ""], ["Science Education Complex A", "SEC A", "Second Floor", "Sec A 202", "SEC A 202", "Seminar Room", "LCD & Screen", "Yes", 50, ""], ["Science Education Complex A", "SEC A", "Second Floor", "Sec A 203", "SEC A 203", "Seminar Room", "LCD & Screen", "Yes", 50, ""], ["Science Education Complex A", "SEC A", "Second Floor", "Sec A 204", "SEC A 204", "Seminar Room", "LCD & Screen", "Yes", 50, ""], ["Science Education Complex A", "SEC A", "Second Floor", "Sec A 205", "SEC A 205", "Seminar Room", "LCD & Screen", "Yes", 50, ""], ["Science Education Complex A", "SEC A", "Second Floor", "Sec A 208", "SEC A 208", "Classroom", "LCD & Screen", "Yes", 50, ""], ["Science Education Complex A", "SEC A", "Second Floor", "Sec A 209", "SEC A 209", "Classroom", "LCD & Screen", "Yes", 50, ""], ["Science Education Complex A", "SEC A", "Second Floor", "Sec A 210", "SEC A 210", "Classroom", "LCD & Screen", "Yes", 50, ""], ["Science Education Complex A", "SEC A", "Second Floor", "Sec A 214", "SEC A 214", "Classroom", "LCD & Screen", "Yes", 50, ""], ["Science Education Complex A", "SEC A", "Second Floor", "Sec A 215", "SEC A 215", "Classroom", "LCD & Screen", "Yes", 50, ""], ["Science Education Complex B", "SEC B", "Second Floor", "Sec B 201A", "SEC B 201", "Lecture Hall", "LCD & Screen, mic", "Yes", 100, "80 fixed seats, 20 tablet chairs"], ["Science Education Complex C", "SEC C", "Second Floor", "Sec C 201A", "SEC C 201", "Lecture Hall", "LCD & Screen, mic", "Yes", 100, "80 fixed seats, 20 tablet chairs"], ["PLDT Convergent Technologies Center", "CTC", "Ground Floor", "CTC 102", "CTC 102", "Classroom", "LCD & Screen", "Yes", 80, ""], ["PLDT Convergent Technologies Center", "CTC", "Ground Floor", "CTC 103", "CTC 103", "Classroom", "LCD & Screen", "Yes", 50, ""], ["PLDT Convergent Technologies Center", "CTC", "Ground Floor", "CTC 104", "CTC 104", "Classroom", "LCD & Screen", "Yes", 50, ""], ["PLDT Convergent Technologies Center", "CTC", "Ground Floor", "CTC 105", "CTC 105", "Classroom", "LCD & Screen", "Yes", 90, ""], ["PLDT Convergent Technologies Center", "CTC", "Ground Floor", "CTC 106", "CTC 106", "Classroom", "LCD & Screen", "Yes", 50, ""], ["PLDT Convergent Technologies Center", "CTC", "Ground Floor", "CTC 107", "", "Classroom", "LCD & Screen", "Yes", 50, ""], ["PLDT Convergent Technologies Center", "CTC", "Ground Floor", "CTC 118", "CTC 118", "Classroom", "LCD & Screen", "Yes", 60, ""], ["PLDT Convergent Technologies Center", "CTC", "Second Floor", "CTC 202", "CTC 202", "Classroom", "LCD & Screen", "Yes", 50, ""], ["PLDT Convergent Technologies Center", "CTC", "Second Floor", "CTC 203", "CTC 203", "Classroom", "LCD & Screen", "Yes", 50, ""], ["PLDT Convergent Technologies Center", "CTC", "Second Floor", "CTC 204", "CTC 204", "Classroom", "LCD & Screen", "Yes", 50, ""], ["PLDT Convergent Technologies Center", "CTC", "Second Floor", "CTC 205", "CTC 205", "Classroom", "LCD & Screen", "Yes", 50, ""], ["PLDT Convergent Technologies Center", "CTC", "Second Floor", "CTC 206", "CTC 206", "Classroom", "LCD & Screen", "Yes", 50, ""], ["PLDT Convergent Technologies Center", "CTC", "Third Floor", "CTC 301", "", "Classroom", "LCD & Screen", "Yes", 50, ""], ["PLDT Convergent Technologies Center", "CTC", "Third Floor", "CTC 302", "CTC 302", "Classroom", "LCD & Screen", "Yes", 50, ""], ["PLDT Convergent Technologies Center", "CTC", "Third Floor", "CTC 303", "CTC 303", "Classroom", "LCD & Screen", "Yes", 50, ""], ["PLDT Convergent Technologies Center", "CTC", "Third Floor", "CTC 304", "CTC 304", "Classroom", "LCD & Screen", "Yes", 50, ""], ["PLDT Convergent Technologies Center", "CTC", "Third Floor", "CTC 305", "CTC 305", "Classroom", "LCD & Screen", "Yes", 50, ""], ["PLDT Convergent Technologies Center", "CTC", "Third Floor", "CTC 306", "CTC 306", "Classroom", "LCD & Screen", "Yes", 50, ""], ["PLDT Convergent Technologies Center", "CTC", "Third Floor", "CTC 307", "CTC 307", "Classroom", "LCD & Screen", "Yes", 50, ""], ["PLDT Convergent Technologies Center", "CTC", "Third Floor", "CTC 308", "CTC 308", "Classroom", "LCD & Screen", "Yes", 50, ""], ["PLDT Convergent Technologies Center", "CTC", "Fourth Floor", "CTC 404", "CTC 404", "Classroom", "LCD & Screen", "Yes", 50, ""], ["PLDT Convergent Technologies Center", "CTC", "Fourth Floor", "CTC 405", "CTC 405", "Classroom", "LCD & Screen", "Yes", 50, ""], ["PLDT Convergent Technologies Center", "CTC", "Fourth Floor", "CTC 406", "CTC 406", "Classroom", "LCD & Screen", "Yes", 50, ""], ["PLDT Convergent Technologies Center", "CTC", "Fourth Floor", "CTC 407", "CTC 407", "Classroom", "LCD & Screen", "Yes", 50, ""], ["PLDT Convergent Technologies Center", "CTC", "Fourth Floor", "CTC 408", "CTC 408", "Classroom", "LCD & Screen", "Yes", 50, ""], ["John Gokongwei School of Management", "SOM", "Ground Floor", "SOM 102 c/o JG-SOM", "", "Classroom", "LCD & Screen", "Yes", 44, ""], ["John Gokongwei School of Management", "SOM", "Ground Floor", "SOM 103 c/o JG-SOM", "", "Classroom", "LCD & Screen", "Yes", 40, ""], ["John Gokongwei School of Management", "SOM", "Ground Floor", "SOM 104 c/o JG-SOM", "", "Classroom", "LCD & Screen", "Yes", 22, ""], ["John Gokongwei School of Management", "SOM", "Ground Floor", "SOM 105", "", "Classroom", "LCD & Screen", "Yes", 50, ""], ["John Gokongwei School of Management", "SOM", "Ground Floor", "SOM 106", "SOM 106", "Classroom", "LCD & Screen", "Yes", 50, ""], ["John Gokongwei School of Management", "SOM", "Ground Floor", "SOM 111 (Ching Tan)", "SOM 111", "Case Study Room", "LCD, screen, mic", "Yes", 98, ""], ["John Gokongwei School of Management", "SOM", "Second Floor", "SOM 202", "SOM 202", "Classroom", "LCD & Screen", "Yes", 50, ""], ["John Gokongwei School of Management", "SOM", "Second Floor", "SOM 203", "SOM 203", "Classroom", "LCD & Screen", "Yes", 50, ""], ["John Gokongwei School of Management", "SOM", "Second Floor", "SOM 204", "SOM 204", "Classroom", "LCD & Screen", "Yes", 50, ""], ["John Gokongwei School of Management", "SOM", "Second Floor", "SOM 205", "SOM 205", "Classroom", "LCD & Screen", "Yes", 50, ""], ["John Gokongwei School of Management", "SOM", "Second Floor", "SOM 210", "SOM 210", "Classroom", "LCD, screen, mic", "Yes", 58, ""], ["John Gokongwei School of Management", "SOM", "Second Floor", "SOM 211", "SOM 211", "Classroom", "LCD, screen, mic", "Yes", 58, ""], ["John Gokongwei School of Management", "SOM", "Third Floor", "SOM 302", "SOM 302", "Classroom", "LCD & Screen", "Yes", 50, ""], ["John Gokongwei School of Management", "SOM", "Third Floor", "SOM 303", "", "Classroom", "LCD & Screen", "Yes", 40, ""], ["John Gokongwei School of Management", "SOM", "Third Floor", "SOM 304", "", "Classroom", "LCD & Screen", "Yes", 40, ""], ["John Gokongwei School of Management", "SOM", "Third Floor", "SOM 305", "", "Classroom", "LCD & Screen", "Yes", 40, ""], ["Faura Hall", "F", "Ground Floor", "F AVR", "Faura AVR", "Lecture Hall", "LCD, screen, mic, computer, clicker", "Yes", 100, ""], ["Faura Hall", "F", "Ground Floor", "F 113", "F 113", "Classroom", "LCD & Screen", "Yes", 50, ""], ["Faura Hall", "F", "Ground Floor", "F 114", "F 114", "Classroom", "LCD & Screen", "Yes", 50, ""], ["Faura Hall", "F", "Ground Floor", "F 115", "F 115", "Classroom", "LCD & Screen", "No", 50, ""], ["Faura Hall", "F", "Ground Floor", "F 116", "F 116", "Classroom", "LCD & Screen", "Yes", 50, ""], ["Faura Hall", "F", "Third Floor", "F 304", "F 304", "Lecture Room", "LCD & Screen", "Yes", 50, ""], ["Kostka Hall", "K", "Second Floor", "K 201", "", "Classroom", "LCD & Screen", "No", 50, ""], ["Kostka Hall", "K", "Second Floor", "K 202", "K 202", "Classroom", "LCD & Screen", "No", 50, ""], ["Kostka Hall", "K", "Second Floor", "K 203", "K 203", "Classroom", "LCD & Screen", "No", 50, ""], ["Kostka Hall", "K", "Second Floor", "K 204", "K 204", "Classroom", "LCD & Screen", "No", 50, ""], ["Kostka Hall", "K", "Third Floor", "K 301", "K 301", "Classroom", "LCD & Screen", "No", 50, ""], ["Kostka Hall", "K", "Third Floor", "K 302", "K 302", "Classroom", "LCD & Screen", "No", 50, ""], ["Kostka Hall", "K", "Third Floor", "K 303", "K 303", "Classroom", "LCD & Screen", "No", 50, ""], ["Kostka Hall", "K", "Third Floor", "K 304", "K 304", "Classroom", "LCD & Screen", "Yes", 50, ""], ["Berchmans Hall", "B", "Ground Floor", "B 103", "B 103", "Classroom", "LCD & Screen", "Yes", 50, ""], ["Berchmans Hall", "B", "Ground Floor", "B 104", "B 104", "Classroom", "LCD & Screen", "Yes", 50, ""], ["Berchmans Hall", "B", "Ground Floor", "B 105", "B 105", "Classroom", "LCD & Screen", "Yes", 50, ""], ["Berchmans Hall", "B", "Ground Floor", "B 106", "B 106", "Classroom", "LCD & Screen", "Yes", 50, ""], ["Berchmans Hall", "B", "Second Floor", "B 205", "", "Classroom", "LCD & Screen", "Yes", 50, ""], ["Berchmans Hall", "B", "Second Floor", "B 206", "B 206", "Classroom", "LCD & Screen", "Yes", 50, ""], ["Berchmans Hall", "B", "Second Floor", "B 207", "B 207", "Classroom", "LCD & Screen", "Yes", 50, ""], ["Berchmans Hall", "B", "Second Floor", "B 208", "B 208", "Classroom", "LCD & Screen", "Yes", 50, ""], ["Berchmans Hall", "B", "Second Floor", "B 209", "B 209", "Classroom", "LCD & Screen", "Yes", 50, ""], ["Berchmans Hall", "B", "Third Floor", "B 305", "B 305", "Classroom", "LCD & Screen", "Yes", 50, ""], ["Berchmans Hall", "B", "Third Floor", "B 306", "B 306", "Classroom", "LCD & Screen", "Yes", 50, ""], ["Berchmans Hall", "B", "Third Floor", "B 307", "B 307", "Classroom", "LCD & Screen", "Yes", 50, ""], ["Berchmans Hall", "B", "Third Floor", "B 308", "B 308", "Classroom", "LCD & Screen", "Yes", 50, ""], ["Berchmans Hall", "B", "Third Floor", "B 309", "B 309", "Classroom", "LCD & Screen", "Yes", 50, ""], ["Gonzaga Hall", "G", "Third Floor", "G 303", "", "Classroom", "LCD & Screen", "Yes", 50, ""], ["Gonzaga Hall", "G", "Third Floor", "G 304", "", "Classroom", "LCD & Screen", "Yes", 50, ""], ["Gonzaga Hall", "G", "Third Floor", "G 305", "G 305", "Classroom", "LCD & Screen", "Yes", 50, ""], ["Gonzaga Hall", "G", "Third Floor", "G 306", "", "Theater", "None listed", "Yes", 80, ""], ["Gonzaga Hall", "G", "Third Floor", "G 310", "", "Exhibit Hall", "None listed", "No", 100, ""], ["Gonzaga Hall", "G", "Third Floor", "G 311", "", "Dance Studio", "None listed", "No", 60, ""], ["Gonzaga Hall", "G", "Third Floor", "G 312", "G 312", "Classroom", "LCD & Screen", "Yes", 30, ""], ["Bellarmine Hall", "BEL", "Ground Floor", "Bel 102", "Bel 102", "Classroom", "LCD & Screen", "No", 50, ""], ["Bellarmine Hall", "BEL", "Ground Floor", "Bel 103 B", "BEL 103B", "Classroom", "LCD & Screen", "No", 50, ""], ["Bellarmine Hall", "BEL", "Ground Floor", "Bel 103 C", "", "Classroom", "LCD & Screen", "No", 50, ""], ["Bellarmine Hall", "BEL", "Second Floor", "Bel 205", "BEL 205", "Classroom", "LCD & Screen", "No", 50, ""], ["Bellarmine Hall", "BEL", "Second Floor", "Bel 206", "BEL 206", "Classroom", "LCD & Screen", "No", 50, ""], ["Bellarmine Hall", "BEL", "Second Floor", "Bel 207", "BEL 207", "Classroom", "LCD & Screen", "No", 50, ""], ["Bellarmine Hall", "BEL", "Second Floor", "Bel 208", "BEL 208", "Classroom", "LCD & Screen", "No", 50, ""], ["Bellarmine Hall", "BEL", "Second Floor", "Bel 209", "BEL 209", "Classroom", "LCD & Screen", "No", 50, ""], ["Bellarmine Hall", "BEL", "Second Floor", "Bel 210", "BEL 210", "Classroom", "LCD & Screen", "Yes", 25, ""], ["Bellarmine Hall", "BEL", "Second Floor", "Bel 211", "BEL 211", "Classroom", "LCD & Screen", "Yes", 25, ""], ["Bellarmine Hall", "BEL", "Second Floor", "Bel 212", "BEL 212", "Classroom", "LCD & Screen", "No", 50, ""], ["Bellarmine Hall", "BEL", "Second Floor", "Bel 213", "BEL 213", "Classroom", "LCD & Screen", "No", 50, ""], ["Bellarmine Hall", "BEL", "Third Floor", "Bel 306", "BEL 306", "Classroom", "LCD & Screen", "No", 50, ""], ["Bellarmine Hall", "BEL", "Third Floor", "Bel 307", "BEL 307", "Classroom", "LCD & Screen", "No", 50, ""], ["Bellarmine Hall", "BEL", "Third Floor", "Bel 308", "BEL 308", "Classroom", "LCD & Screen", "Yes", 100, ""], ["Bellarmine Hall", "BEL", "Third Floor", "Bel 309", "BEL 309", "Classroom", "LCD & Screen", "No", 50, ""], ["Bellarmine Hall", "BEL", "Third Floor", "Bel 310", "BEL 310", "Classroom", "LCD & Screen", "No", 50, ""], ["Bellarmine Hall", "BEL", "Third Floor", "Bel 311", "BEL 311", "Classroom", "LCD & Screen", "No", 50, ""], ["Bellarmine Hall", "BEL", "Third Floor", "Bel 312", "BEL 312", "Classroom", "LCD & Screen", "No", 30, ""], ["Bellarmine Hall", "BEL", "Third Floor", "Bel 313", "BEL 313", "Classroom", "LCD & Screen", "No", 80, ""], ["Schmitt Hall", "C", "", "C 109", "", "Classroom", "LCD & Screen", "Yes", 80, ""], ["Schmitt Hall", "C", "", "C 114", "", "Classroom", "LCD & Screen", "Yes", 45, ""], ["Social Sciences Building", "SS", "Ground Floor", "CSR (SS 101)", "", "Case Study Room", "LCD & Screen", "Yes", 70, ""], ["Social Sciences Building", "SS", "Ground Floor", "SS 280", "", "Communication classroom", "LCD & Screen", "Yes", 56, ""], ["Fine Arts Building", "FA", "", "FA Annex 101", "FA 101", "Classroom", "LCD & Screen", "Yes", 35, ""], ["Fine Arts Building", "FA", "", "FA Annex 104", "FA 104", "Classroom", "LCD & Screen", "Yes", 30, ""], ["Fine Arts Building", "FA", "", "FA Annex 106", "FA 106", "Classroom", "LCD & Screen", "Yes", 35, ""], ["Leong Hall", "LH", "", "LH 111", "Leong Hall Auditorium", "Auditorium", "LCD, screen, computer, mics, clicker", "Yes", 476, ""], ["Social Sciences Building", "SS", "", "SocSci Foyer", "SocSci Foyer", "Foyers", "None listed", "No", 100, "Source lists one capacity for all SS and SEC foyers"], ["Science Education Complex B", "SEC B", "", "SEC B Foyer", "SEC B Foyer", "Foyers", "None listed", "No", 100, "Source lists one capacity for all SS and SEC foyers"], ["Science Education Complex C", "SEC C", "", "SEC C Foyer", "SEC C Foyer", "Foyers", "None listed", "No", 100, "Source lists one capacity for all SS and SEC foyers"], ["MVP Center for Student Leadership", "MVP", "", "Colayco Pavilion", "Colayco Pavillion", "Pavilion", "None listed", "No", 120, ""], ["MVP Center for Student Leadership", "MVP", "", "MVP Roofdeck", "MVP Roofdeck", "Roofdeck", "None listed", "No", 300, ""], ["Faber Hall", "FH", "", "RMT", "RMT", "Theater", "None listed", "Yes", 200, ""], ["Science Education Complex", "SEC", "", "SEC Field", "SEC Field", "Field", "None listed", "No", 500, ""], ["Loyola Schools Promenade", "", "", "Promenade #1", "Promenade#1", "Promenade", "None listed", "No", "", "Capacity not listed in source"], ["Loyola Schools Promenade", "", "", "Promenade #2", "Promenade#2", "Promenade", "None listed", "No", "", "Capacity not listed in source"], ["Loyola Schools Promenade", "", "", "Promenade #3", "Promenade#3", "Promenade", "None listed", "No", "", "Capacity not listed in source"], ["Loyola Schools Promenade", "", "", "Promenade #4", "Promenade#4", "Promenade", "None listed", "No", "", "Capacity not listed in source"], ["Loyola Schools Promenade", "", "", "Promenade #5", "Promenade#5", "Promenade", "None listed", "No", "", "Capacity not listed in source"], ["Loyola Schools Promenade", "", "", "Promenade #6", "Promenade#6", "Promenade", "None listed", "No", "", "Capacity not listed in source"], ["Loyola Schools Promenade", "", "", "Promenade #7", "Promenade#7", "Promenade", "None listed", "No", "", "Capacity not listed in source"], ["Loyola Schools Promenade", "", "", "Promenade #8", "Promenade#8", "Promenade", "None listed", "No", "", "Capacity not listed in source"], ["Loyola Schools Promenade", "", "", "Promenade #9", "Promenade#9", "Promenade", "None listed", "No", "", "Capacity not listed in source"], ["Loyola Schools Promenade", "", "", "Promenade #10", "Promenade#10", "Promenade", "None listed", "No", "", "Capacity not listed in source"], ["Bellarmine Field", "", "", "Bellarmine Field", "Bellarmine Field", "Field", "None listed", "No", 5000, ""]], "registry": [["Audio Visual Room", "Faura AVR", "c_c9631a2fddcf4ad74ced214780cade7bac80a4f0ce8152b725434ae4d4a1e0b6@group.calendar.google.com"], ["Auditorium", "Leong Hall Auditorium", "c_d4611414bf9a73ebc50633daadf19d12c2606ff5d160238f1138c8fd60705de1@group.calendar.google.com"], ["Case Study Rooms", "SOM 111", "c_7876a464ba25790d725863fdb86f5b88d071d14ce4a42e38451e7ac7cfdc7e48@group.calendar.google.com"], ["Classrooms", "B 102", "c_30af28852aeb98c08cb7ffe72c5ef04a38aca8295e68fc081b749c4c380025eb@group.calendar.google.com"], ["Classrooms", "B 103", "c_ea7df175b2fb4dd3a4ef04a678669097f9da154d366b727a8dce4b72e9fba3a3@group.calendar.google.com"], ["Classrooms", "B 104", "c_db88261f890bbb9fd5941291e2ae0017e661eb17dd0c7e614376ae78bbb9e2c2@group.calendar.google.com"], ["Classrooms", "B 105", "c_18190ccd838402078eb901b7cf72f65877cdaa6c275bf871389d4587b9fee107@group.calendar.google.com"], ["Classrooms", "B 106", "c_7753aecee4d51dc5a0a8a7baf7bc78c57fb083084c00faba83477705335cbba7@group.calendar.google.com"], ["Classrooms", "B 206", "c_e099842a6434d633b1eae729f9d7bf686120ada389c544fc2df622672cb720a5@group.calendar.google.com"], ["Classrooms", "B 207", "c_5dbb594731931600991792e4e8ff7fe2db879a6283cc325e2db1ba829cdfb86b@group.calendar.google.com"], ["Classrooms", "B 208", "c_c553fedb6f4c2c25e63e526b39817aa793de0ce34dd11256dc56b88d57cc7be0@group.calendar.google.com"], ["Classrooms", "B 209", "c_949b342f34dd8cb5aa936e4383f4042aa56ac8f759ef65b0abf1503ffe5767db@group.calendar.google.com"], ["Classrooms", "B 305", "c_07ee8efc50e85990ca931337c55e16a12f7ad49784c1fc2f960ab89aebe08bf4@group.calendar.google.com"], ["Classrooms", "B 306", "c_5e150b2852e6b568d9630382b9cd71a39f4713438fda3fb4a9d8a007cf649668@group.calendar.google.com"], ["Classrooms", "B 307", "c_2f6ea6e5e6bac0afe1ecf4c4e545aebdfaeb2dbe6492bf4d9c344ebaa6284d93@group.calendar.google.com"], ["Classrooms", "B 308", "c_61fe40664be14482b512dd2894f57a7dba0d5f860df1b8a9f92ef693c165dfab@group.calendar.google.com"], ["Classrooms", "B 309", "c_11e9f96b810009840203dee7e073f5c183a21a659601f3b0976b65d970726910@group.calendar.google.com"], ["Classrooms", "Bel 102", "c_2199c9d8096293a3ab05443e8351bce21d5f2fcd3469120ccde729e3d85eeb5e@group.calendar.google.com"], ["Classrooms", "BEL 103B", "c_7bcc8b6ed290f292a9c5ec69fbe7af82dfc931966f2e47ba55b93873872decd2@group.calendar.google.com"], ["Classrooms", "BEL 205", "c_23712c2a7ff595a238bc2e2d19e1b723b23862b45de0acc3f58f53276e98f9c1@group.calendar.google.com"], ["Classrooms", "BEL 206", "c_8e5b8e4489ff496dfe5521c1bf05de61e90a1bad350f74b381b912c88e1d4db2@group.calendar.google.com"], ["Classrooms", "BEL 207", "c_c8dc07d6df4a8265633fd3bf639c00258c8ed79a5dbacf791f89c25abaf05c0e@group.calendar.google.com"], ["Classrooms", "BEL 208", "c_ce729311de384cbabb17155f302b0b016e1d77d95fc1a0b04c41215e7324e9e3@group.calendar.google.com"], ["Classrooms", "BEL 209", "c_b7cd76dfd55df8bc5470de635eaba1c984b7d5703212cbaae81a2e16098a929b@group.calendar.google.com"], ["Classrooms", "BEL 210", "c_ddfa21b71e9e57c579285ae4172ad81101d369bd0b2dd412c84e7a4be8617564@group.calendar.google.com"], ["Classrooms", "BEL 211", "c_e42cb1b0fec56727a6caa9928a4840a3212eec6a78377551f8cbe3cf564038c2@group.calendar.google.com"], ["Classrooms", "BEL 212", "c_775b8abba2575461f63d4bc318508c91f1cf09e34f1e6fec2f49321a59ffff85@group.calendar.google.com"], ["Classrooms", "BEL 213", "c_d360073d0abd020ec841694274e67ed00b1a3cd43b416a18db0cecb3ae877cf0@group.calendar.google.com"], ["Classrooms", "BEL 306", "c_cf71dab77ca2beff856e407f7988b5e392e605327a73176c8624ccdd1892bfb2@group.calendar.google.com"], ["Classrooms", "BEL 307", "c_7e78b92bf848733579019529a441086019b4f5fd51975cc721a8b3bc2b03173a@group.calendar.google.com"], ["Classrooms", "BEL 308", "c_b64383b8315a87ec4067e84cda8fc00e654cc09dd9c320d750595d2afd1bc95c@group.calendar.google.com"], ["Classrooms", "BEL 309", "c_a2eea1c668532a9abb81888b9d86a67402fafa8fee6153866565e0b570946cdb@group.calendar.google.com"], ["Classrooms", "BEL 310", "c_041495c6d60e1f2762c460a5936c915ac5155ce00088bae981ea94c20017fdf5@group.calendar.google.com"], ["Classrooms", "BEL 311", "c_7753cc22d94b5307ff16ffc7ee16242be2bec5bb0a7705b0b9b18fa28157d916@group.calendar.google.com"], ["Classrooms", "BEL 312", "c_30bd88edf2db1915b87c5119f0403d3e3803d419701333c14e635e8a5332307a@group.calendar.google.com"], ["Classrooms", "BEL 313", "c_31c166efcb49453194a1bc47c46db83360cee62bb404b5d245a50a6947d07dc6@group.calendar.google.com"], ["Classrooms", "CTC 102", "c_30f5dcbf5864b995fa1f9b90bb2bf6950fc2f5830c5c9603c82bb35300b6684f@group.calendar.google.com"], ["Classrooms", "CTC 103", "c_4d09f057a9d1e9f41c2e21036b26e258961f1f0cade27f4dabf879afcc9b4cf8@group.calendar.google.com"], ["Classrooms", "CTC 104", "c_2b7079fd05619396a381d5c568949f10b2be76a1a1a368a92dcb88d6da5c9ebe@group.calendar.google.com"], ["Classrooms", "CTC 105", "c_7edcfa00ed173521f0c46a6e410215707f744c5d24d2c8251228937c91c90ed4@group.calendar.google.com"], ["Classrooms", "CTC 106", "c_847a28042242b50522aab2a6411b090b0d8d4a41e00ff15083a8d66ce0aada56@group.calendar.google.com"], ["Classrooms", "CTC 118", "c_879d77821bb866b9d8adc5ebf557d399a7ecd9eedb0bb74bbd2e5b56d1c2f42a@group.calendar.google.com"], ["Classrooms", "CTC 202", "c_28329a53d6ff7a9845b95aba4da2796ef8c6f85aeb27477c41bc7329d516b456@group.calendar.google.com"], ["Classrooms", "CTC 203", "c_66c668f8ac069370d14c97f09be7912150760187786503e253b1093ee6b1564a@group.calendar.google.com"], ["Classrooms", "CTC 204", "c_110fe707f1647be08154ef44acd489360d66ceaf7b07a75d2d6d5a7022dcc0d7@group.calendar.google.com"], ["Classrooms", "CTC 205", "c_884405c041e7cd556788987bf44e15916fb52c7be21d4c31cf5af6a28126ae01@group.calendar.google.com"], ["Classrooms", "CTC 206", "c_4f17e20a4c91e39baceddfe6aa3ef07c75483cc1d85bd9e4db826ddf1189b7a7@group.calendar.google.com"], ["Classrooms", "CTC 216", "c_c33c540b262a10afae3b6bd533700e979a4a081d808a8259dda910abf30d1314@group.calendar.google.com"], ["Classrooms", "CTC 302", "c_a3e6525d49a44979822ce7c0e9481f91a6a49a6ce1807ce52e8b7e550abe7721@group.calendar.google.com"], ["Classrooms", "CTC 303", "c_1a82ff4607b8401fa29c447adba34f651b378046bacd6fc1a354f956083e3051@group.calendar.google.com"], ["Classrooms", "CTC 304", "c_5b306ffa280b5801b41c2f07bc184ea4c71fe18e5133743fc3c534401ad2e908@group.calendar.google.com"], ["Classrooms", "CTC 305", "c_b68dc609ce0af9d5675131b77e47090e4346ca4da9dc7f4fb5ee18353ab86cf7@group.calendar.google.com"], ["Classrooms", "CTC 306", "c_64aeb3915e395364c275e924a8097f7014c59a09daf6f763435950e5cbeabbfd@group.calendar.google.com"], ["Classrooms", "CTC 307", "c_53dd44b959ee13b46d3048b16c875caf160a7fea32caa89b78000daed056546a@group.calendar.google.com"], ["Classrooms", "CTC 308", "c_72d4ca9bf9524643b56743d559d065fa7935f9960440135dd9cb21ff45db91b9@group.calendar.google.com"], ["Classrooms", "CTC 404", "c_352dec7ecefca6f72a444966571b4c67babd576b067ee1e6f837738101d439c0@group.calendar.google.com"], ["Classrooms", "CTC 405", "c_7051a40c25633ce931691a381d960194d146b91b4d5a0c9d35f2a486971ce7f0@group.calendar.google.com"], ["Classrooms", "CTC 406", "c_ec36fb46b9ee6605ab4cabe82729296f46f268024f3a7d3c8a92e0b040f89a7a@group.calendar.google.com"], ["Classrooms", "CTC 407", "c_02955e6879c905c1175b55113df3ac06cd2d73fd6aed1a8cca58273c6a840934@group.calendar.google.com"], ["Classrooms", "CTC 408", "c_54219269f36626e7c9eaa9726e4ed3be13998df590968a813576b96169fae881@group.calendar.google.com"], ["Classrooms", "F 113", "c_eb85289b1ed16952fd4a7e60a6f86216b826feb20087c9c8b98e5f28d8c01bff@group.calendar.google.com"], ["Classrooms", "F 114", "c_0990af87b70e7f872ba5b54bf7c17c9c925abcd430297c843ebbc5b533d8f6e9@group.calendar.google.com"], ["Classrooms", "F 115", "c_80bf50d8f0c1dab8f81bfde2be60dccd9a789cc33f12ab9791aa156456258002@group.calendar.google.com"], ["Classrooms", "F 116", "c_8c2113b3edfde21131c5de5ae992aef863b05ef9012378b4b89f3ed96247edba@group.calendar.google.com"], ["Classrooms", "F 304", "c_39a92ca5e210af1e7bf8009f629e039af876601065d6d26566839b84054f90f1@group.calendar.google.com"], ["Classrooms", "FA 101", "c_6db53a052c4938f0864a9de363e949bc1d4eafe9c216ad6f57107f9de7ee6209@group.calendar.google.com"], ["Classrooms", "FA 104", "c_94fdf7592fe4a73fae85a193a6d497f8ca1d08cf32c843e4eb445c376024c0a1@group.calendar.google.com"], ["Classrooms", "FA 106", "c_b997ff7c97cd9177d7a9c957ae6769b429fa6ad2cbeaabd83c1fa4b01c699117@group.calendar.google.com"], ["Classrooms", "G 204", "c_6a62efb9cd8e268ee9c19be97abd0db879f1d495303ff92d87c744b2df6c0fdc@group.calendar.google.com"], ["Classrooms", "G 205", "c_631c92f05a14ab8190eb8198972d3929fc0c02580a8c934e73301bd36bf8f2d7@group.calendar.google.com"], ["Classrooms", "G 206", "c_fa16c99e71ca69c78460d65b1935aae78ef336c6447ef7e0f296623ab57f8397@group.calendar.google.com"], ["Classrooms", "G 305", "c_b7b947d6d9912137decaaaf6b0488cf8dc00d51a9f347fe3b7760a509aff24c8@group.calendar.google.com"], ["Classrooms", "G 312", "c_2b9314018efb314ee0b844a69fb50f52157b57ba805069a50d0c369fccd7b556@group.calendar.google.com"], ["Classrooms", "K 202", "c_bef91b38be85326baae89317ad4f759c383d5016b662fb2194c1be92b4788e47@group.calendar.google.com"], ["Classrooms", "K 203", "c_65c08920671d25953450f8af33d3fe8bd76e973b570f74e5ddf8f74629f16d72@group.calendar.google.com"], ["Classrooms", "K 204", "c_0001c4f274c1eb4d83cf2ec8ea63c2e4fa4903ecdda3e04a47f5c42ad3c2dbe9@group.calendar.google.com"], ["Classrooms", "K 301", "c_4098bf7ef0b97278312fa44f4dbcebaa54ed66b546a6301b68b63da8bdd4fb41@group.calendar.google.com"], ["Classrooms", "K 302", "c_bb3274569d758224415c81dfcd9f3e95159d4ccda376279e1ffa1b3139f5c2cc@group.calendar.google.com"], ["Classrooms", "K 303", "c_eff550651bec5eaa9e8882dc3bed7f70f39cc1a6197b3dda71c7cebe61d8080f@group.calendar.google.com"], ["Classrooms", "K 304", "c_fad47c200bdcef031c38441afdc3f186c394f9e9cea4a66630d9ee62627e3eed@group.calendar.google.com"], ["Classrooms", "SEC A 117", "c_9cd686db00f68271cb76f8503b99c75082f3927c41b90f7521e9e48153313303@group.calendar.google.com"], ["Classrooms", "SEC A 118", "c_5ca853152bfaedf54045e7f50bc2b231eeb2cf7fccc446550f17b99648d1ceb8@group.calendar.google.com"], ["Classrooms", "SEC A 123", "c_ef0b33b15dbd49e492ae5cff34bd0f77f6f68d9fc53dca30c941048eac4a9bd6@group.calendar.google.com"], ["Classrooms", "SEC A 124", "c_075877f464159fe9a41511241fc27c34ae16c6c54e65c5baf74a84ac7fe532e8@group.calendar.google.com"], ["Classrooms", "SEC A 208", "c_b0da0001104092c762f9dd952751f9006116d91f5094b575f0210d6f7e461356@group.calendar.google.com"], ["Classrooms", "SEC A 209", "c_eae64db1394363bda128eef4edc67d0195c73c5a213716e95a84be3683efdbd7@group.calendar.google.com"], ["Classrooms", "SEC A 210", "c_7d6d575a076a4d5370ea0f10062c241c6ea9541773fa0fe1dcabe93e7e3cee6f@group.calendar.google.com"], ["Classrooms", "SEC A 214", "c_f16d253d49dd0f052248330594b0540c9de8faf5c01d28145cf3b11819a20c55@group.calendar.google.com"], ["Classrooms", "SEC A 215", "c_76c61207c32d3b0440f89752e6dcbd2b9a09e20d3a1d17c344e835bb356ce289@group.calendar.google.com"], ["Classrooms", "SOM 106", "c_0640f31ce66675c72b45ed56a25c1faf18d310eddd7d535a5407e5d8f62e185f@group.calendar.google.com"], ["Classrooms", "SOM 202", "c_7bc34d9c974850565235a27a385d991c0a7b9bd39ee72f0c0d2ed6c97ae9ac9b@group.calendar.google.com"], ["Classrooms", "SOM 203", "c_f43e02682f7499b7236b5294559a0d807a295c6d87efe114e299e749d48490e0@group.calendar.google.com"], ["Classrooms", "SOM 204", "c_f78de8755aa15cb23a51e84c538857a875fa8348bb2b99075ec83ef140de1904@group.calendar.google.com"], ["Classrooms", "SOM 205", "c_680605447aaf9b5e691311fcf6d1da9432cdce2997c895eafdbe14bb8314193d@group.calendar.google.com"], ["Classrooms", "SOM 210", "c_7510f07d9ca76e63b088836982b97660e4a2e8e108d866eae482a8a28134127c@group.calendar.google.com"], ["Classrooms", "SOM 211", "c_88b1b55978b34932160ba63ec51026b2ea31d73fa210f0373882cd7957a61a3a@group.calendar.google.com"], ["Classrooms", "SOM 302", "c_e74244f7c798faea47183f7208a4a678bef969e84ed17624f8277fcbb6087334@group.calendar.google.com"], ["Consultation Rooms", "Dela Costa Consultation Rm.1", "c_32d6eb5bd09aca1dc08bf8efc1463be2c2c990ff36c6165972b17ad738b9377c@group.calendar.google.com"], ["Consultation Rooms", "Dela Costa Consultation Rm.11", "c_a7866732bacc54f7ad5c8fb90888495c148698892611cc34f4a526ca5cc75b2a@group.calendar.google.com"], ["Consultation Rooms", "Dela Costa Consultation Rm.12", "c_dc61b1086addf686198c44dd48a143b7da8c3e8f302f117acfe0b34e3afd1153@group.calendar.google.com"], ["Consultation Rooms", "Dela Costa Consultation Rm.13", "c_93eb121571f9de3e873627c0511c2d46365517cd88c79d7f5b4d3dc8f98d8d7f@group.calendar.google.com"], ["Consultation Rooms", "Dela Costa Consultation Rm.2", "c_b385439e3fbe1aa750a5faf744f56b82a11d1e8aa157959b20b825bcb0c87439@group.calendar.google.com"], ["Consultation Rooms", "Dela Costa Consultation Rm.3", "c_6540bb00b74dd2c54d4192ce98258d66fa49a918b69e1585c3ee20a779f70123@group.calendar.google.com"], ["Consultation Rooms", "Dela Costa Consultation Rm.5", "c_b32b0e62405981e2ae56bf404814844a75dd8a73a7e05b957f8b45983d7a294e@group.calendar.google.com"], ["Consultation Rooms", "Dela Costa Consultation Rm.6", "c_f24b35a7864e73fe8dec25b5732827c396e55d2c0a8609a9a00c66ad16eda8e7@group.calendar.google.com"], ["Consultation Rooms", "Dela Costa Consultation Rm.7", "c_0074c462ff13ef996fa1a74ec4b3f122a95fb101b1e701669672f05e76f9902f@group.calendar.google.com"], ["Consultation Rooms", "Dela Costa Consultation Rm.9", "c_c1918d8be53ef23cbe60a90ae50a8a7cba930fdc80bab692795f07514bc759c5@group.calendar.google.com"], ["Foyers", "Gonzaga Foyer #1", "c_c5406328c3d2c96be27cf2c7d4de151d054ba5c04045522c577752ea694e980d@group.calendar.google.com"], ["Foyers", "Gonzaga Foyer #2", "c_7e666bbee7e46b59b276e7e9a8fbd39a5bfce214e585b2662ffc526b4d1c42e3@group.calendar.google.com"], ["Foyers", "SEC B Foyer", "c_f6137163eb6ac6e26af566e5cebfb39a00d9d5540dc93404211bc41527a0b739@group.calendar.google.com"], ["Foyers", "SEC C Foyer", "c_74560a2beaf007705b4cc46599eadf5d1501811f9d54b870efd117c257558ca2@group.calendar.google.com"], ["Foyers", "SocSci Foyer", "c_bbb4b84319dffa66018f8865d725f8f2f3a3399589ebff7285d4c64bd95e649b@group.calendar.google.com"], ["Garden", "Zen Garden (Gonzaga side)", "c_0d13e6e025f8096b41d38aea6e2da9f18041361d087cd60ab80b8ecbff87c57f@group.calendar.google.com"], ["Garden", "Zen Garden (Kostka side)", "c_a8194141ee03c72e653469da4effa9ef4254ac4c8b48a003d881832906a534ec@group.calendar.google.com"], ["HE Covered Courts", "College covered court 1", "c_9d6192b882912983a19772da12c3decf161f740290d252551a1e82b4494ea418@group.calendar.google.com"], ["HE Covered Courts", "College covered court 2", "c_e0b38f884d30ee878a3b839a0075b92364c453cdca73b0ff306da1f9bca2cda3@group.calendar.google.com"], ["HE Covered Courts", "College covered court 3", "c_575b83582fc64e9d0cdd0ea7cde9e32861e06964d5ce1c36704c00505b35b644@group.calendar.google.com"], ["HE Covered Courts", "College covered court 4", "c_2def455153fcc399eb2ac402d243b8775a9b90cf9f8bba2b029228f63e686dc2@group.calendar.google.com"], ["HE Covered Courts", "College covered court 5", "c_3bfc914c998a1b59336561b64c91138423006ef60d72c10abb5325ae968a27ca@group.calendar.google.com"], ["HE Covered Courts", "College covered court 6", "c_cc7b4842d365415bd4a701e819a4bb371dbe43300802f45df377729ddb30a0be@group.calendar.google.com"], ["HE Covered Courts", "College covered court 7", "c_72d0b15b3b1eaac8b2c4deda6b63417e2c44621791e96292ff73ee8d00add733@group.calendar.google.com"], ["HE Covered Courts", "College covered court 8", "c_259fcc51fd7deecd04b314dcd77395655a259cd3606e3664b21dffa53b308bca@group.calendar.google.com"], ["Lecture Halls", "Escaler Hall", "c_e5e626ecd3495a0bd9f9240ec14cc0aab142993869e6273f03c2b24b4b1e0ea3@group.calendar.google.com"], ["Lecture Halls", "SEC B 201", "c_130e813b7f190e4f243b00bc52e7786d428103f7b0c1e2e6f2db6adab828c24e@group.calendar.google.com"], ["Lecture Halls", "SEC C 201", "c_6ec005b059bcc4bcdec057d0a792752645396d9f8f3864aab14466286533e041@group.calendar.google.com"], ["Open Fields", "Bellarmine Field", "c_d843396ab0d00afa072ea47016ba19d74ea99f23a4b4214393d4d7ef05688ade@group.calendar.google.com"], ["Open Fields", "SEC Field", "c_a681cfbd8639b0ddc6ce085b73f8aad9f4496a260773f9bfdde40bdb87227464@group.calendar.google.com"], ["OSA Managed Venues", "MVP 310 Music Room", "c_9cb1c4bbf740afa611e5a1365f3e88088cdde59d05eea87399f55edb7f8182f7@group.calendar.google.com"], ["OSA Managed Venues", "MVP 321 - Student Center Conference Room", "c_2e64ddf0b37945bc5103798b62517254e820d0d12b4b896d8d8a5a9ac40bbb0b@group.calendar.google.com"], ["Other Venue(s)", "Baseball Field", "c_bbc5af1f4b9ada4f42ce707425355570398ea3c24721421eacf5bdb77ffe870d@group.calendar.google.com"], ["Other Venue(s)", "Colayco Pavillion", "c_geb2smq5bq77v8tnof8fu2dugg@group.calendar.google.com"], ["Other Venue(s)", "Doghouse", "c_shbj98djugv6jaq7u1vebhopv0@group.calendar.google.com"], ["Other Venue(s)", "Kostka Extension", "c_cq4r6vnavebstak09ho57040no@group.calendar.google.com"], ["Other Venue(s)", "Moro Football Field", "c_1dd101171059f72476e9bea3528f3566502635f84c7862b590301353db10ef7c@group.calendar.google.com"], ["Other Venue(s)", "Ocampo Field", "c_85ee11a31f6f58a7dab0d32e4804fe89cd97f30bd19def3b52c2829f18c90ff4@group.calendar.google.com"], ["Other Venue(s)", "Ocampo Small Field", "c_720ef9fd6a042d2b078d95c7e17383e4c6b45d5c79122537c09b69efb025a68d@group.calendar.google.com"], ["Promenade", "Promenade#1", "c_e27eb32fa608250e709809a238de1c3cd9427ab43679c3ea23d5daed7507ef93@group.calendar.google.com"], ["Promenade", "Promenade#10", "c_8537a9fca229fe59f2e74d4cbc04fb802cb0423a285d9f80e72c360c66efa0e6@group.calendar.google.com"], ["Promenade", "Promenade#2", "c_673dcc17e5438db92fddf4779a2c26528bc0526cfb0693ad192bb554a298c5f2@group.calendar.google.com"], ["Promenade", "Promenade#3", "c_06471db3f83e9cd16af3e834cb5c228cc366738fadad1228316bfab33572ebe0@group.calendar.google.com"], ["Promenade", "Promenade#4", "c_8072bcf71d2bf13ed7318ffda43eec92329f75b6bd327ed92fa056a32bfd1f9c@group.calendar.google.com"], ["Promenade", "Promenade#5", "c_be8d4af02cbb638065f8159e393fa4843d0bc139574361f71d0bfa6dd2adcae7@group.calendar.google.com"], ["Promenade", "Promenade#6", "c_023e98cbef5962c5120caccf0a82c99137bf4f825daccbe9a27ae6bc42a11139@group.calendar.google.com"], ["Promenade", "Promenade#7", "c_7966cf2c4ffdd9d639036ef138c18b5739d97ead8366ab59e79f1f81af87cc05@group.calendar.google.com"], ["Promenade", "Promenade#8", "c_f5e226e1269b7da0c69e8f68fdd3f843515ce3c41ddf4d52995fec10b7108a8c@group.calendar.google.com"], ["Promenade", "Promenade#9", "c_3fcbb511eebced7d6b16667f99327e73c760e2c4123ef48a689b2146d3a48dbf@group.calendar.google.com"], ["Roof Deck", "MVP Roofdeck", "c_4b40115c2e79ed7b36198199c1095b57e0dfc85843bbad4ffccb8b69c72cea9c@group.calendar.google.com"], ["Seminar Rooms", "SEC A 202", "c_bf68d8e45174a3efdda6c9bca00249e4caab7b25f29b08148eae07e3d1d38815@group.calendar.google.com"], ["Seminar Rooms", "SEC A 203", "c_21884390814eb6679d7dd8b9b8218b8abbba63b7504c546ae39ea875daeafb69@group.calendar.google.com"], ["Seminar Rooms", "SEC A 204", "c_227d79535fe62530d03f88f97c812cd1bc3be04c2aca1fde320d5c6a11a0230e@group.calendar.google.com"], ["Seminar Rooms", "SEC A 205", "c_153c2fcf0bb84a4e55e275c76ee6f6fa039eff7fff9ae0a6e183e349f64e7e89@group.calendar.google.com"], ["Theatres", "RMT", "c_c31710f53d6086b6bdf2a3a6a4742ab009505248fb46cfcd66e04a1c1a8db0ff@group.calendar.google.com"]], "codes": [["B", "Berchmans Hall"], ["BEL", "Bellarmine Hall"], ["C", "Schmitt Hall"], ["CTC", "PLDT Convergent Technologies Center"], ["", "Dela Costa Hall"], ["F", "Faura Hall"], ["FA", "Fine Arts Building"], ["FH", "Faber Hall"], ["G", "Gonzaga Hall"], ["K", "Kostka Hall"], ["LH", "Leong Hall"], ["SEC A", "Science Education Complex A"], ["SEC B", "Science Education Complex B"], ["SEC C", "Science Education Complex C"], ["SOM", "John Gokongwei School of Management"], ["SS/SOSCI/SOCSCI", "Social Sciences Building"], ["MVP", "MVP Center for Student Leadership"]]};

// Same palette as the web portal.
const THEME = Object.freeze({
  font: 'Geist',
  dark: '#174a2f',
  green: '#1f6f43',
  light: '#e2efe6',
  tint: '#f4f8f5',
  white: '#ffffff',
  text: '#142019',
  muted: '#56655b',
  border: '#c9d6cd',
  flag: '#fbf0dc',
  tabs: Object.freeze({
    Home: '#1f6f43', Availability: '#4cae76', Reservations: '#4cae76', 'Venue Specs': '#9aa89f',
    'Building Codes': '#9aa89f', Settings: '#56655b', 'Venue Registry': '#56655b',
  }),
});

// Data each tab is built from: what the workbook already holds, else SETUP_DATA.
let BUILD_DATA = SETUP_DATA;

const SOURCE_NOTE = 'Source: HE Venue Explorer (original Google Sheet), copied 4 October 2026.';


function buildWorkbook() {
  assertSheetCaller_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone('Asia/Manila');
  ss.setSpreadsheetLocale('en_US');

  const legacyHome = ss.getSheetByName('READ ME');
  if (legacyHome && !ss.getSheetByName('Home')) legacyHome.setName('Home');

  const existing = captureExisting_(ss);
  BUILD_DATA = {
    specs: existing.specs || SETUP_DATA.specs,
    codes: existing.codes || SETUP_DATA.codes,
    registry: existing.registry || SETUP_DATA.registry,
  };

  const order = ['Home', 'Availability', 'Reservations', 'Venue Specs', 'Building Codes', 'Settings', 'Venue Registry'];
  const sheets = {};
  order.forEach(function (name, index) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name, index);
    sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).breakApart();
    sheet.clear();
    sheet.clearConditionalFormatRules();
    sheet.getDataRange().clearDataValidations();
    sheet.getBandings().forEach(function (banding) { banding.remove(); });
    if (sheet.getFilter()) sheet.getFilter().remove();
    sheet.setTabColor(THEME.tabs[name]);
    ss.setActiveSheet(sheet);
    ss.moveActiveSheet(index + 1);
    sheets[name] = sheet;
  });
  // Remove the blank tab a new spreadsheet starts with.
  ss.getSheets().forEach(function (sheet) {
    if (order.indexOf(sheet.getName()) === -1 && sheet.getLastRow() === 0) ss.deleteSheet(sheet);
  });

  buildSettings_(sheets['Settings'], existing.settings);
  buildRegistry_(sheets['Venue Registry']);
  buildBuildingCodes_(sheets['Building Codes']);
  buildVenueSpecs_(sheets['Venue Specs']);
  buildHome_(sheets['Home']);
  buildReservations_(sheets['Reservations']);
  buildAvailability_(sheets['Availability']);

  refreshInputValidations_();
  updateVenueDropdown_(sheets['Reservations'], true);
  installSearchCheckboxes();
  clearPortalCache_();

  ss.setActiveSheet(sheets['Home']);
  SpreadsheetApp.flush();
  ss.toast('Workbook built.', 'HE Venue Explorer', 5);
  return 'Built ' + order.length + ' tabs';
}


/** Reads the data and settings already in the workbook, so a rebuild keeps them. */
function captureExisting_(ss) {
  const rows = function (name, columns) {
    const sheet = ss.getSheetByName(name);
    if (!sheet || sheet.getLastRow() < 2) return null;
    const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, columns).getValues()
      .filter(function (row) { return row.some(function (cell) { return cell !== ''; }); });
    return values.length ? values : null;
  };
  const settings = ss.getSheetByName('Settings');
  return {
    specs: rows('Venue Specs', 10),
    codes: rows('Building Codes', 2),
    registry: rows('Venue Registry', 3),
    settings: settings && settings.getLastRow() >= 2
      ? settings.getRange('A2:B9').getDisplayValues()
      : null,
  };
}


// --- TABS ---

function buildHome_(sheet) {
  prepareSheet_(sheet, 26, 7, [24, 230, 230, 24, 170, 430, 24]);
  sheet.getRange('A1:G26').setBackground(THEME.tint);

  title_(sheet.getRange('B2:F2'), 'HE Venue Explorer');
  sheet.getRange('B3:F3').merge()
    .setValue('Venue availability and booking for the Loyola Schools HE venues on the CFMO portal.')
    .setFontColor(THEME.muted).setHorizontalAlignment('center');

  sheet.getRange('B5:F5').merge()
    .setFormula('=IF(Settings!$B$9="","The web portal link appears here once the portal is deployed.",' +
      'HYPERLINK(Settings!$B$9,"Open the web portal  →"))')
    .setBackground(THEME.light).setFontColor(THEME.green).setFontWeight('bold').setFontSize(13)
    .setHorizontalAlignment('center')
    .setBorder(true, true, true, true, null, null, THEME.border, SpreadsheetApp.BorderStyle.SOLID);
  sheet.setRowHeight(5, 40);

  panel_(sheet, 'B7:C7', 'B8:C13', 'Quick start',
    '1. Availability: pick dates and a facility type, then tick Search to list free time slots.\n' +
    '2. Reservations: pick one venue to see its bookings.\n' +
    '3. To book, use HE Venue Explorer > New venue request, or the Book page of the web portal. ' +
    'It checks the venue is free and opens the request form already filled in.');

  panel_(sheet, 'E7:F7', 'E8:F13', 'How it works',
    'The explorer reads the public Google Calendar of every venue on the CFMO Venue Reservation Portal. ' +
    'Venue Registry lists those calendars; Venue Specs adds capacity, air-con and equipment.\n\n' +
    'Light green cells are inputs. Operating hours and the longest search are on the Settings tab.');

  panel_(sheet, 'B15:C15', 'B16:C20', 'Limitations',
    'If the office replaces a venue calendar, refresh the registry with HE Venue Explorer > Refresh venue registry.\n\n' +
    'Specs come from a manually kept list. Venues marked No under Specs on file in Venue Registry ' +
    'are skipped when you filter by capacity or air-con.');

  header_(sheet.getRange('E15:F15'), 'Important links');
  const links = [
    ['Venue Availability', 'https://sites.google.com/ateneo.edu/lsreservations/he-venues/venue-availability'],
    ['Reservation Forms', 'https://sites.google.com/ateneo.edu/lsreservations/he-venues/forms'],
    ['Venue Layout', 'https://sites.google.com/ateneo.edu/lsreservations/he-venues/layout'],
    ['OSA Managed Venues', 'https://sites.google.com/ateneo.edu/ateneolsosa/help-me/osa-venues-schedule'],
  ];
  sheet.getRange('E16:F20').setBackground(THEME.white)
    .setBorder(true, true, true, true, null, null, THEME.border, SpreadsheetApp.BorderStyle.SOLID);
  sheet.getRange('E16:E19').setValues(links.map(function (link) { return [link[0]]; }));
  sheet.getRange('F16:F19').setFormulas(links.map(function (link) {
    return ['=HYPERLINK("' + link[1] + '","' + link[1].replace('https://', '') + '")'];
  }));

  sheet.getRange('B22:F22').merge()
    .setFormula('="Venue list last refreshed: "&Settings!B6')
    .setFontColor(THEME.muted).setFontSize(9);
  sheet.setRowHeights(8, 6, 22);
  sheet.setRowHeights(16, 5, 26);
}


function buildReservations_(sheet) {
  prepareSheet_(sheet, 60, 7, [24, 330, 140, 150, 120, 330, 24]);
  title_(sheet.getRange('B2:F2'), 'Reservations Lookup');
  howTo_(sheet,
    '1. Pick a Start Date and End Date (31 days at most).\n' +
    '2. Pick a Type of Facility, then a Venue. The Venue list follows the type.\n' +
    '3. Tick Search. Results replace anything below.\n' +
    '4. Wider date ranges take longer.');

  filterBlock_(sheet, 'C4:C8', 'D4:D8', ['Start Date', 'End Date', 'Type of Facility', 'Venue', 'Search']);
  dateInputs_(sheet, ['D4', 'D5']);
  sheet.getRange('D8').insertCheckboxes().setHorizontalAlignment('center');

  // Specs for the selected venue, matched on Venue Specs' Calendar Name column.
  const specLabels = ['Building', 'Equipment', 'Air-con', 'Capacity'];
  const specColumns = ['A', 'G', 'H', 'I'];
  sheet.getRange('E4:E7').setValues(specLabels.map(function (label) { return [label]; }));
  sheet.getRange('F4:F7').setFormulas(specColumns.map(function (column) {
    return ['=IF($D$7="","",XLOOKUP($D$7,\'Venue Specs\'!$E$2:$E,\'Venue Specs\'!$' + column + '$2:$' + column + ',"No specs on file"))'];
  }));
  styleLabels_(sheet.getRange('E4:E7'));
  sheet.getRange('F4:F7').setHorizontalAlignment('center').setBackground(THEME.white);
  sheet.getRange('E8:F8').merge()
    .setFormula('=LET(id,XLOOKUP($D$7,\'Venue Registry\'!$B$2:$B,\'Venue Registry\'!$C$2:$C,""),' +
      'IF(id="","Pick a venue to link its calendar",' +
      'HYPERLINK("https://calendar.google.com/calendar/embed?ctz=Asia%2FManila&src="&ENCODEURL(id),"Open this venue\'s Google Calendar")))')
    .setHorizontalAlignment('center').setBackground(THEME.light);
  sheet.getRange('E4:F8').setBorder(true, true, true, true, true, true, THEME.border, SpreadsheetApp.BorderStyle.DOTTED);
  sheet.getRange('B4:F8').setBorder(true, true, true, true, null, null, THEME.border, SpreadsheetApp.BorderStyle.SOLID);

  resultHeader_(sheet, 'B10:F10', 'B11:F11', ['Event', 'Date', 'Start', 'End', 'Description'],
    'Complete the filters, then tick Search');
  sheet.getRange('B12:F').setVerticalAlignment('middle').setWrap(true);
  zebra_(sheet, 'B12:F', '$B12');
  sheet.getRange('C12:E').setHorizontalAlignment('center');
}


function buildAvailability_(sheet) {
  prepareSheet_(sheet, 60, 9, [24, 300, 140, 230, 160, 120, 100, 90, 24]);
  title_(sheet.getRange('B2:H2'), 'Availability Lookup');
  howTo_(sheet,
    '1. Pick a Start Date and End Date (31 days at most).\n' +
    '2. Pick a Type of Facility. Leave Building blank to see every building.\n' +
    '3. Optional: set a minimum capacity, require air-con, or a minimum free time.\n' +
    '4. Tick Search. Slots are listed earliest first.');

  filterBlock_(sheet, 'C4:C8', 'D4:D8', ['Start Date', 'End Date', 'Type of Facility', 'Building', 'Search']);
  dateInputs_(sheet, ['D4', 'D5']);
  sheet.getRange('D7').setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInRange(sheet.getParent().getSheetByName('Building Codes').getRange('B2:B'), true)
    .setAllowInvalid(false).build());
  sheet.getRange('D8').insertCheckboxes().setHorizontalAlignment('center');

  filterBlock_(sheet, 'E4:E7', 'F4:F7', ['Min. capacity', 'Air-con', 'Min. free time (mins)', 'Operating hours']);
  sheet.getRange('F4').setValue(0).setNumberFormat('0');
  sheet.getRange('F5').setValue('Any').setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(['Any', HE_CONFIG.airConRequired], true).setAllowInvalid(false).build());
  sheet.getRange('F6').setValue(60).setNumberFormat('0');
  [sheet.getRange('F4'), sheet.getRange('F6')].forEach(function (range) {
    range.setDataValidation(SpreadsheetApp.newDataValidation()
      .requireNumberGreaterThanOrEqualTo(0).setAllowInvalid(false)
      .setHelpText('Enter 0 or more. 0 turns this filter off.').build());
  });
  sheet.getRange('F7')
    .setFormula('=TEXT(Settings!B2,"h:mm AM/PM")&" to "&TEXT(Settings!B3,"h:mm AM/PM")')
    .setBackground(THEME.white).setFontSize(9);
  sheet.getRange('E8:H8').merge()
    .setValue('Capacity and air-con filters skip venues with no specs on file.')
    .setFontSize(8).setHorizontalAlignment('center').setBackground(THEME.white);
  sheet.getRange('G4:H7').merge()
    .setValue('Change operating hours on the Settings tab.')
    .setFontSize(8).setWrap(true).setHorizontalAlignment('center').setVerticalAlignment('middle');
  sheet.getRange('B4:H8').setBorder(true, true, true, true, null, null, THEME.border, SpreadsheetApp.BorderStyle.SOLID);

  resultHeader_(sheet, 'B10:H10', 'B11:H11',
    ['Venue', 'Date', 'Start', 'End', 'Free for', 'Capacity', 'Air-con'],
    'Complete the filters, then tick Search');
  sheet.getRange('C12:H').setHorizontalAlignment('center');
  zebra_(sheet, 'B12:H', '$B12');
}


function buildVenueSpecs_(sheet) {
  const headers = ['Building', 'Code', 'Floor', 'Room', 'Calendar Name', 'Facility Type',
    'Equipment', 'Air-con', 'Capacity', 'Capacity Notes'];
  const rows = BUILD_DATA.specs;
  prepareSheet_(sheet, rows.length + 50, headers.length, [230, 60, 110, 170, 230, 160, 250, 70, 80, 280]);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  tableStyle_(sheet, headers.length);
  sheet.getRange('I2:I').setNumberFormat('#,##0').setHorizontalAlignment('right');
  sheet.getRange('H2:H').setHorizontalAlignment('center').setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(['Yes', 'No'], true).setAllowInvalid(false).build());
  sheet.getRange('B2:C').setHorizontalAlignment('center');
  sheet.getRange('A1').setNote(SOURCE_NOTE + ' Building, floor and code filled in from the section headings of the original list.');
  sheet.getRange('E1').setNote('The venue name used in Venue Registry. Reservations and Availability use it to find a venue\'s specs. ' +
    'Blank means the room has no calendar on the reservation portal.');
  sheet.setFrozenColumns(0);
}


function buildBuildingCodes_(sheet) {
  const rows = BUILD_DATA.codes;
  prepareSheet_(sheet, rows.length + 30, 2, [160, 320]);
  sheet.getRange('A1:B1').setValues([['Code', 'Building']]);
  sheet.getRange(2, 1, rows.length, 2).setValues(rows);
  tableStyle_(sheet, 2);
  sheet.getRange('A1').setNote(SOURCE_NOTE + ' Separate several codes for one building with a slash (SS/SOCSCI). ' +
    'Availability matches a venue to a building by these codes or by the building\'s first word.');
}


function buildSettings_(sheet, previous) {
  prepareSheet_(sheet, 12, 3, [260, 200, 460]);
  const rows = [
    ['Setting', 'Value', 'Notes'],
    ['Opening time', '6:00 AM', 'Availability ignores time before this.'],
    ['Closing time', '10:00 PM', 'Availability ignores time after this.'],
    ['Longest search (days)', 31, 'Both lookups refuse wider date ranges.'],
    ['Minimum venues for a valid refresh', 100, 'A registry refresh that finds fewer venues is rejected and the old list is kept.'],
    ['Last registry refresh', '8 September 2026, 11:16 PM', 'Written by Refresh venue registry. This value comes from the original file.'],
    ['Daily auto-refresh', 'Off', 'Use HE Venue Explorer > Turn daily auto-refresh on or off.'],
    ['Venue request form', REQUEST_FORM.defaultUrl, 'HE Facilities & Equipment Request Form. New venue request builds its prefilled link from this address.'],
    ['Web portal', '', 'Filled in by HE Venue Explorer > Open the web portal after the portal is deployed.'],
  ];
  sheet.getRange('B6:B9').setNumberFormat('@');
  // Keep values from an earlier build, matched by setting name.
  (previous || []).forEach(function (old) {
    const row = rows.find(function (r) { return r[0] === old[0]; });
    if (row && old[1] !== '') row[1] = old[1];
  });
  sheet.getRange(1, 1, rows.length, 3).setValues(rows);
  tableStyle_(sheet, 3);
  if (sheet.getFilter()) sheet.getFilter().remove();
  sheet.getRange('B2:B3').setNumberFormat('h:mm AM/PM');
  sheet.getRange('B4:B5').setNumberFormat('0');
  sheet.getRange('B2:B5').setBackground(THEME.light).setFontWeight('bold');
  sheet.getRange('B2:B9').setHorizontalAlignment('center');
  sheet.getRange('C2:C9').setWrap(true);
  sheet.getRange('B8:B9').setBackground(THEME.light).setWrap(true).setFontSize(8);
  sheet.getRange('A11').setValue('Light green cells are inputs you can change.').setFontStyle('italic');
  sheet.getBandings().forEach(function (banding) { banding.remove(); });
}


function buildRegistry_(sheet) {
  const rows = BUILD_DATA.registry;
  prepareSheet_(sheet, rows.length + 50, 4, [170, 300, 640, 110]);
  sheet.getRange('A1:C1').setValues([['Type', 'Venue', 'Calendar ID']]);
  sheet.getRange(2, 1, rows.length, 3).setValues(rows);
  sheet.getRange('D1').setFormula(
    '={"Specs on file";ARRAYFORMULA(IF(B2:B="",,IF(COUNTIF(\'Venue Specs\'!E2:E,B2:B),"Yes","No")))}');
  tableStyle_(sheet, 4);
  sheet.getRange('D2:D').setHorizontalAlignment('center');
  sheet.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('No')
      .setBackground(THEME.flag).setRanges([sheet.getRange('D2:D')]).build(),
  ]);
  sheet.getRange('A1').setNote('Source: CFMO Venue Reservation Portal, https://sites.google.com/ateneo.edu/lsreservations/he-venues ' +
    'and the OSA venues page. The refresh time is on the Settings tab. ' +
    'HE Venue Explorer > Refresh venue registry rewrites columns A to C.');
}


// --- STYLE HELPERS ---

/** Shades every other filled result row; extends to rows added later. */
function zebra_(sheet, a1, anchor) {
  const rules = sheet.getConditionalFormatRules();
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND(' + anchor + '<>"",ISEVEN(ROW()))')
    .setBackground(THEME.tint)
    .setRanges([sheet.getRange(a1)])
    .build());
  sheet.setConditionalFormatRules(rules);
}

function prepareSheet_(sheet, rows, columns, widths) {
  if (sheet.getMaxRows() > rows) sheet.deleteRows(rows + 1, sheet.getMaxRows() - rows);
  if (sheet.getMaxRows() < rows) sheet.insertRowsAfter(sheet.getMaxRows(), rows - sheet.getMaxRows());
  if (sheet.getMaxColumns() > columns) sheet.deleteColumns(columns + 1, sheet.getMaxColumns() - columns);
  if (sheet.getMaxColumns() < columns) sheet.insertColumnsAfter(sheet.getMaxColumns(), columns - sheet.getMaxColumns());
  widths.forEach(function (width, index) { sheet.setColumnWidth(index + 1, width); });
  sheet.getRange(1, 1, rows, columns).setFontFamily(THEME.font).setFontSize(10).setVerticalAlignment('middle');
  sheet.setHiddenGridlines(true);
}


function title_(range, text) {
  range.merge().setValue(text).setBackground(THEME.green).setFontColor(THEME.white)
    .setFontSize(16).setFontWeight('bold').setHorizontalAlignment('center')
    .setBorder(true, true, true, true, null, null, THEME.border, SpreadsheetApp.BorderStyle.SOLID);
  range.getSheet().setRowHeight(range.getRow(), 34);
}


function header_(range, text) {
  if (range.getNumRows() * range.getNumColumns() > 1) range.merge();
  range.setValue(text).setBackground(THEME.dark).setFontColor(THEME.white).setFontWeight('bold');
}


function panel_(sheet, headerA1, bodyA1, heading, body) {
  header_(sheet.getRange(headerA1), heading);
  sheet.getRange(bodyA1).merge().setValue(body).setBackground(THEME.white)
    .setWrap(true).setVerticalAlignment('top');
}


function howTo_(sheet, text) {
  header_(sheet.getRange('B4'), 'How to use');
  sheet.getRange('B4').setHorizontalAlignment('center');
  sheet.getRange('B5:B8').merge().setValue(text).setWrap(true).setVerticalAlignment('middle')
    .setFontSize(9).setBackground(THEME.white);
}


function filterBlock_(sheet, labelsA1, inputsA1, labels) {
  sheet.getRange(labelsA1).setValues(labels.map(function (label) { return [label]; }));
  styleLabels_(sheet.getRange(labelsA1));
  sheet.getRange(inputsA1).setBackground(THEME.light).setHorizontalAlignment('center')
    .setBorder(true, true, true, true, true, true, THEME.border, SpreadsheetApp.BorderStyle.DOTTED);
}


function styleLabels_(range) {
  range.setBackground(THEME.light).setFontWeight('bold').setHorizontalAlignment('center')
    .setBorder(true, true, true, true, true, true, THEME.border, SpreadsheetApp.BorderStyle.DOTTED);
}


function dateInputs_(sheet, cells) {
  cells.forEach(function (a1) {
    sheet.getRange(a1).setNumberFormat('ddd, mmm d, yyyy').setDataValidation(
      SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false)
        .setHelpText('Enter a date, such as 10/6/2026.').build());
  });
}


function resultHeader_(sheet, statusA1, headerA1, headers, status) {
  sheet.getRange(statusA1).merge().setValue(status).setBackground(THEME.green).setFontColor(THEME.white)
    .setFontWeight('bold').setFontSize(13).setHorizontalAlignment('center');
  sheet.getRange(headerA1).setValues([headers]).setBackground(THEME.dark).setFontColor(THEME.white)
    .setFontWeight('bold').setHorizontalAlignment('center');
  sheet.getRange(statusA1.split(':')[0] + ':' + headerA1.split(':')[1])
    .setBorder(true, true, true, true, null, null, THEME.border, SpreadsheetApp.BorderStyle.SOLID);
  sheet.setFrozenRows(sheet.getRange(headerA1).getRow());
  sheet.setRowHeight(sheet.getRange(statusA1).getRow(), 30);
}


function tableStyle_(sheet, columns) {
  sheet.getRange(1, 1, 1, columns).setBackground(THEME.dark).setFontColor(THEME.white)
    .setFontWeight('bold').setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
  sheet.setHiddenGridlines(false);
  sheet.getRange(1, 1, sheet.getMaxRows(), columns)
    .applyRowBanding(SpreadsheetApp.BandingTheme.GREEN, true, false)
    .setHeaderRowColor(THEME.dark)
    .setFirstRowColor(THEME.white)
    .setSecondRowColor('#f1f7ee');
  sheet.getRange(1, 1, sheet.getLastRow(), columns).createFilter();
}

