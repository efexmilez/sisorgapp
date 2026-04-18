// Nigerian States (36 + FCT)
export const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa',
  'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti',
  'Enugu', 'FCT Abuja', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano',
  'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger',
  'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto',
  'Taraba', 'Yobe', 'Zamfara'
] as const

// Local Government Areas per state
export const NIGERIAN_LGAS: Record<string, string[]> = {
  'Abia': ['Aba North', 'Aba South', 'Arochukwu', 'Bende', 'Ikwano', 'Isiala-Ngwa North', 'Isiala-Ngwa South', 'Isuikwuato', 'Umuahia North', 'Umuahia South', 'Umu-Neochi'],
  'Adamawa': ['Demsa', 'Fufore', 'Ganaye', 'Gireri', 'Gombi', 'Guyuk', 'Hong', 'Jada', 'Lamurde', 'Madagali', 'Maiha', 'Mayo-Belwa', 'Michika', 'Mubi-North', 'Mubi-South', 'Numan', 'Shelleng', 'Song', 'Toungo', 'Yola-North', 'Yola-South'],
  'Akwa Ibom': ['Abak', 'Eastern-Oro', 'Eket', 'Esit-Eket', 'Ibeno', 'Ibesikpo-Asutan', 'Ibiono-Ibom', 'Ika', 'Ikono', 'Ikot-Abasi', 'Ikot-Ekpene', 'Ini', 'Itu', 'Mbo', 'Mkpat-Enin', 'Nsit-Atai', 'Nsit-Ibom', 'Nsit-Uyumth', 'Obot-Akara', 'Okobo', 'Onna', 'Oron', 'Oruk-Anam', 'Ukanafun', 'Uruan', 'Urue-Offong/Oruko', 'Uyo'],
  'Anambra': ['Aguata', 'Anambra-East', 'Anambra-West', 'Anaocha', 'Awka-North', 'Awka-South', 'Ayamelum', 'Dunukofia', 'Ekwusigo', 'Idemili-North', 'Idemili-South', 'Ihiala', 'Njikoka', 'Nnewi-North', 'Nnewi-South', 'Ogbaru', 'Onitsha-North', 'Onitsha-South', 'Orumba-North', 'Orumba-South', 'Oyi'],
  'Bauchi': ['Alkaleri', 'Bauchi', 'Bogoro', 'Damban', 'Darazo', 'Dass', 'Gamawa', 'Ganjuwa', 'Giade', 'Itas/Gadau', 'Jamaare', 'Katagum', 'Kirfi', 'Misau', 'Ningi', 'Shira', 'Tafawa-Balewa', 'Toro', 'Warji', 'Zaki'],
  'Bayelsa': ['Brass', 'Ekeremor', 'Kolga/N-Doro', 'Nembe', 'Ogbia', 'Ovia-North-East', 'Ovia-South-West', 'Okpo', 'Sagbama', 'Southern-Ijaw', 'Yenagoa'],
  'Benue': ['Ado', 'Agatu', 'Apa', 'Buruku', 'Gboko', 'Guma', 'Gwer-East', 'Gwer-West', 'Katsina-Ala', 'Konshisha', 'Kwande', 'Logo', 'Makurdi', 'Obi', 'Ogbadibo', 'Oju', 'Okpokwu', 'Ohimini', 'Oturkpo', 'Tarka', 'Ukum', 'Ushongo', 'Vandeikya'],
  'Borno': ['Abadam', 'Askira-Uba', 'Bama', 'Bayo', 'Biu', 'Chibok', 'Damboa', 'Dikwa', 'Gubio', 'Guzamala', 'Gwoza', 'Hawul', 'Jere', 'Kaga', 'Kalka/Balge', 'Konduga', 'Kukawa', 'Kwaya-Kusar', 'Mafa', 'Magumeri', 'Maiduguri', 'Marte', 'Mobbar', 'Monguno', 'Ngala', 'Nganzai', 'Shani'],
  'Cross River': ['Abia', 'Akamkpa', 'Akpabuyo', 'Bakassi', 'Bekwarra', 'Biase', 'Boki', 'Calabar-Municipal', 'Calabar-South', 'Etung', 'Ikom', 'Obanliku', 'Obubra', 'Obudu', 'Odukpani', 'Ogoja', 'Yakurr', 'Yala'],
  'Delta': ['Aniocha-North', 'Aniocha-South', 'Bomadi', 'Burutu', 'Ethiope-East', 'Ethiope-West', 'Ika-North-East', 'Ika-South', 'Isoko-North', 'Isoko-South', 'Ndokwa-East', 'Ndokwa-West', 'Okpe', 'Oshimili-North', 'Oshimili-South', 'Patani', 'Sapele', 'Udu', 'Ughelli-North', 'Ughelli-South', 'Ukwuani', 'Uvwie', 'Warri-Central', 'Warri-North', 'Warri-South'],
  'Ebonyi': ['Abakaliki', 'Afikpo-North', 'Afikpo-South', 'Ebonyi', 'Ezza-North', 'Ezza-South', 'Ikwo', 'Ishielu', 'Ivo', 'Izzi', 'Ohafia', 'Onicha'],
  'Edo': ['Akoko-Edo', 'Egor', 'Esan-Central', 'Esan-North-East', 'Esan-South-East', 'Esan-West', 'Etsako-Central', 'Etsako-East', 'Etsako-West', 'Igueben', 'Ikpoba-Okha', 'Oredo', 'Orhionmwon', 'Ovia-North-East', 'Ovia-South-West', 'Owan-East', 'Owan-West', 'Uhunmwonde'],
  'Ekiti': ['Ado-Ekiti', 'Efon', 'Ekiti-East', 'Ekiti-West', 'Ekiti-South-West', 'Emure', 'Gbonyin', 'Ijero', 'Ikere', 'Ikole', 'Ilejemeje', 'Irepodun/Ifelodun', 'Ise/Orun', 'Moba', 'Oye'],
  'Enugu': ['Aninri', 'Awgu', 'Enugu-East', 'Enugu-North', 'Enugu-South', 'Ezeagu', 'Igbo-Eze-North', 'Igbo-Eze-South', 'Isi-Uzo', 'Nkanu-East', 'Nkanu-West', 'Nssukka', 'Oji-River', 'Udenu', 'Udi', 'Uzo-Uwani'],
  'FCT Abuja': ['Abaji', 'Bwari', 'Gwagwalada', 'Kuje', 'Kwali', 'Municipal'],
  'Gombe': ['Akko', 'Balanga', 'Billiri', 'Dukku', 'Funakaye', 'Gombe', 'Kaltungo', 'Kwami', 'Nafada', 'Shongom', 'Yamaltu/Deba'],
  'Imo': ['Aboh-Mbaise', 'Ahiazu-Mbaise', 'Ehime-Mbano', 'Ezinihitte', 'Ideato-North', 'Ideato-South', 'Ihitte/Uboma', 'Ikeduru', 'Isiala-Mbano', 'Isu', 'Mbaitoli', 'Ngor-Okpala', 'Njaba', 'Nkwerre', 'Nwangele', 'Obowo', 'Oguta', 'Ohaji/Egbema', 'Okigwe', 'Onuimo', 'Orlu', 'Orsu', 'Oru-West', 'Owerri-Municipal', 'Owerri-North', 'Owerri-West'],
  'Jigawa': ['Auyo', 'Babura', 'Birni-Kudu', 'Birni-Wa', 'Buji', 'Dutse', 'Gagarawa', 'Garki', 'Gumel', 'Guri', 'Gwaram', 'Gwiwa', 'Hadejia', 'Jahun', 'Kafin-Hausa', 'Kaugama', 'Kazaure', 'Kiri-Kasamma', 'Kiyawa', 'Kaugama', 'Maigatari', 'Malamadori', 'Miga', 'Ringim', 'Roni', 'Sule-Tankarkar', 'Taura', 'Yankwashi'],
  'Kaduna': ['Birnin-Gwari', 'Chikun', 'Giwa', 'Igabi', 'Ikara', 'Jaba', 'Jemaa', 'Kachia', 'Kaduna-North', 'Kaduna-South', 'Kagarko', 'Kajuru', 'Kaura', 'Kauru', 'Kubau', 'Kudan', 'Lere', 'Makarfi', 'Sabon-Gari', 'Sanga', 'Soba', 'Zaria'],
  'Kano': ['Albasu', 'Bagwai', 'Bebeji', 'Bichi', 'Bunkure', 'Dala', 'Dambatta', 'Dawakin-Kudu', 'Dawakin-Tofa', 'Doguwa', 'Fagge', 'Gabas', 'Garko', 'Garun-Mallan', 'Gaya', 'Gezawa', 'Kabo', 'Kano-Municipal', 'Karaye', 'Kibiya', 'Kiru', 'Kumbotso', 'Kunchi', 'Kura', 'Madobi', 'Makoda', 'Minjibir', 'Nassarawa', 'Rano', 'Rimin-Gado', 'Rogo', 'Shanono', 'Sumaila', 'Takai', 'Tarauni', 'Tofa', 'Tsanyawa', 'Tudun-Wada', 'Ungogo', 'Warawa', 'Wudil'],
  'Katsina': ['Bakori', 'Batagarawa', 'Batsari', 'Baure', 'Bindawa', 'Charanchi', 'Dan-Musa', 'Dandume', 'Danja', 'Daura', 'Dutsi', 'Dutsin-Ma', 'Faskari', 'Funtua', 'Ingawa', 'Jibia', 'Kafur', 'Kaita', 'Kankara', 'Kankia', 'Katsina', 'Kurfi', 'Kusada', 'Mai-Adua', 'Malumfashi', 'Mani', 'Mashi', 'Matazu', 'Musawa', 'Rimi', 'Sabuwa', 'Safana', 'Sandamu', 'Zango'],
  'Kebbi': ['Aleiro', 'Arewa-Dandi', 'Argungu', 'Augie', 'Bagudo', 'Birnin-Kebbi', 'Bunza', 'Dandi', 'Danko', 'Fakai', 'Gwandu', 'Jega', 'Kalgo', 'Koko/Besse', 'Maiyama', 'Ngaski', 'Sakaba', 'Shanga', 'Suru', 'Wasagu/Danko', 'Yauri', 'Zuru'],
  'Kogi': ['Adavi', 'Ajaokuta', 'Ankpa', 'Dekina', 'Ibaji', 'Idah', 'Igalamela-Odolu', 'Ijumu', 'Kabba/Bunu', 'Kogi', 'Lokoja', 'Mopamuro', 'Ofu', 'Ogori/Magongo', 'Okehi', 'Okene', 'Olamaboro', 'Omala', 'Yagba-East', 'Yagba-West'],
  'Kwara': [' Asa', 'Baruten', 'Edu', 'Ekiti', 'Ifelodun', 'Ilorin-East', 'Ilorin-South', 'Ilorin-West', 'Isin', 'Kaiama', 'Morogbo', 'Oke-Ero', 'Omu-Aran', 'Pategi'],
  'Lagos': ['Agege', 'Ajeromi-Ifelodun', 'Alimosho', 'Amuwo-Odofin', 'Apapa', 'Badagry', 'Epe', 'Eti-Osa', 'Ibeju-Lekki', 'Ifako-Ijaiye', 'Ikeja', 'Kosofe', 'Lagos-Island', 'Lagos-Mainland', 'Mushin', 'Ojo', 'Oshodi-Isolo', 'Shomolu', 'Surulere'],
  'Nasarawa': ['Awe', 'Doma', 'Karu', 'Keana', 'Keffi', 'Kokona', 'Lafia', 'Nasarawa', 'Nasarawa-Eggon', 'Obi', 'Toto', 'Wamba'],
  'Niger': ['Agaye', 'Agwara', 'Bida', 'Borgu', 'Bosso', 'Chanchaga', 'Edati', 'Edidi', 'Gbako', 'Gurara', 'Katcha', 'Kontagora', 'Lapai', 'Lavun', 'Magama', 'Mariga', 'Mashegu', 'Mokwa', 'Moya', 'Paikoro', 'Rafi', 'Rijau', 'Shiroro', 'Suleja', 'Tafa', 'Wushishi'],
  'Ogun': ['Abeokuta-North', 'Abeokuta-South', 'Ado-Odo/Ota', 'Ewekoro', 'Ibadan-North-East', 'Ibadan-North-West', 'Ibadan-South-East', 'Ibadan-South-West', 'Ifo', 'Ijebu-East', 'Ijebu-North', 'Ijebu-North-East', 'Ijebu-Ode', 'Ikenne', 'Imeko-Afon', 'Ipokia', 'Obafemi-Owode', 'Odeda', 'Odogbolu', 'Remo-North', 'Remo-South', 'Sagamu', 'Yewa-North', 'Yewa-South'],
  'Ondo': ['Akoko-North-East', 'Akoko-North-West', 'Akoko-South-East', 'Akoko-South-West', 'Akure-North', 'Akure-South', 'Ese-Odo', 'Idanre', 'Ifedayo', 'Ilaje', 'Ile-Oluji/Okeigbo', 'Irele', 'Odigbo', 'Okitipupa', 'Ondo-West', 'Ondo-East', 'Ose', 'Owo'],
  'Osun': ['Atakumosa-East', 'Atakumosa-West', 'Aiyedaade', 'Aiyedire', 'Boluwaduro', 'Boripe', 'Ede-North', 'Ede-South', 'Egbedore', 'Ejigbo', 'Ife-Central', 'Ife-East', 'Ife-North', 'Ife-South', 'Ila', 'Ilesa-East', 'Ilesa-West', 'Irepodun', 'Irewole', 'Isokan', 'Iwo', 'Odo-Otin', 'Ola-Oluwa', 'Olorunda', 'Oriade', 'Orolu', 'Osogbo'],
  'Oyo': ['Afijio', 'Akinyele', 'Atiba', 'Atisbo', 'Egbeda', 'Ibadan-Central', 'Ibadan-North', 'Ibadan-North-East', 'Ibadan-North-West', 'Ibadan-South-East', 'Ibadan-South-West', 'Ibarapa-Central', 'Ibarapa-East', 'Ibarapa-North', 'Ido', 'Iseyin', 'Itesiwaju', 'Iwajowa', 'Kajola', 'Lagelu', 'Ogbomosho-North', 'Ogbomosho-South', 'Ogo-Oluwa', 'Olorunsogo', 'Oluyole', 'Ona-Ara', 'Orelope', 'Ori-Ire', 'Oyo-West', 'Oyo-East', 'Saki-East', 'Saki-West', 'Surulopesi'],
  'Plateau': ['Bokkos', 'Barkin-Ladi', 'Bassa', 'Jos-East', 'Jos-North', 'Jos-South', 'Kanam', 'Kanke', 'Langtang-North', 'Langtang-South', 'Mangu', 'Mikang', 'Pankshin', 'Kanam', 'Quan\'Pan', 'Riyom', 'Shendam', 'Wase'],
  'Rivers': ['Abua/Odual', 'Ahoada-East', 'Ahoada-West', 'Akuku-Toru', 'Andoni', 'Asari-Toru', 'Bonny', 'Degema', 'Eleme', 'Emohua', 'Etche', 'Gokana', 'Ikwerre', 'Khana', 'Obio/Akpor', 'Ogba/Egbema/Ndoni', 'Ogu/Bolo', 'Okrika', 'Omuma', 'Opobo/Nkoro', 'Oyigbo', 'Port-Harcourt', 'Tai'],
  'Sokoto': ['Bodinga', 'Dange-Shuni', 'Gada', 'Goronyo', 'Gudu', 'Gwadabawa', 'Illela', 'Isa', 'Kebbe', 'Kware', 'Rabah', 'Sabon-Birni', 'Shagari', 'Silame', 'Sokoto-North', 'Sokoto-South', 'Tambuwal', 'Tangaza', 'Tureta', 'Wamako', 'Wurno', 'Yabo'],
  'Taraba': ['Ardo-Kola', 'Bali', 'Donga', 'Gashaka', 'Gassol', 'Ibi', 'Jalingo', 'Karin', 'Kurmi', 'Lau', 'Sardauna', 'Takum', 'Ussa', 'Wukari', 'Yorro', 'Zing'],
  'Yobe': ['Bade', 'Bari', 'Bursari', 'Damaturu', 'Fika', 'Fune', 'Geidam', 'Gujba', 'Gulani', 'Jakusko', 'Karasuwa', 'Machina', 'Nangere', 'Nguru', 'Potiskum', 'Tarmuwa', 'Yunusari', 'Yusufari'],
  'Zamfara': ['Anka', 'Bakura', 'Birnin-Magaji', 'Bukkuyum', 'Bungudu', 'Chafe', 'Gummi', 'Gusau', 'Kaura-Namoda', 'Maradun', 'Mirya', 'Shinkafi', 'Talata-Mafara', 'Zurmi']
}

// Nigerian Banks with Paystack codes
export const NIGERIAN_BANKS = [
  { name: 'GTBank', code: '058' },
  { name: 'Access Bank', code: '044' },
  { name: 'Zenith Bank', code: '057' },
  { name: 'First Bank', code: '011' },
  { name: 'UBA', code: '033' },
  { name: 'Fidelity Bank', code: '070' },
  { name: 'Union Bank', code: '032' },
  { name: 'Sterling Bank', code: '232' },
  { name: 'Wema Bank', code: '035' },
  { name: 'Stanbic IBTC', code: '221' },
  { name: 'FCMB', code: '214' },
  { name: 'Ecobank', code: '050' },
  { name: 'Kuda Bank', code: '50211' },
  { name: 'Opay', code: '100004' },
  { name: 'Palmpay', code: '100033' },
  { name: 'Moniepoint', code: '50515' },
  { name: 'Keystone Bank', code: '082' },
  { name: 'Polaris Bank', code: '076' },
  { name: 'Heritage Bank', code: '030' },
  { name: 'Providus Bank', code: '101' },
  { name: 'TAJ Bank', code: '302' },
  { name: 'Citibank', code: '023' },
  { name: 'Standard Chartered', code: '068' }
] as const

export type NigerianState = typeof NIGERIAN_STATES[number]
export type NigerianBank = typeof NIGERIAN_BANKS[number]
