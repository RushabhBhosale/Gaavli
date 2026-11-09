// Photos on the Services and Transport tiles, from Wikimedia Commons. Each is
// cropped to 4:3 and compressed; authors and licences are credited in the app
// (Settings, Photo credits) as their licences require.
export type PhotoCredit = {
  group: string;
  file: string;
  author: string;
  license: string;
  licenseUrl: string;
  page: string;
};
export const PHOTO_CREDITS: readonly PhotoCredit[] = [
  {
    group: "repairs",
    file: "Blacksmith in village Rahon, Shaheed Bhagat Singh Nagar district, Punjab, India 01.jpg",
    author: "Gurdeepdali",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:Blacksmith_in_village_Rahon,_Shaheed_Bhagat_Singh_Nagar_district,_Punjab,_India_01.jpg",
  },
  {
    group: "building",
    file: "A construction worker (2017).jpg",
    author: "Rioneno",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:A_construction_worker_(2017).jpg",
  },
  {
    group: "health",
    file: "Child receiving a medical checkup in a clinic with a doctor using a stethoscope.jpg",
    author: "Shixart1985",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0",
    page: "https://commons.wikimedia.org/wiki/File:Child_receiving_a_medical_checkup_in_a_clinic_with_a_doctor_using_a_stethoscope.jpg",
  },
  {
    group: "shops",
    file: "Grocery Store - Budhibili - Dandadhar Road - Dhenkanal 2018-01-25 9609.JPG",
    author: "Biswarup Ganguly",
    license: "CC BY 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by/3.0",
    page: "https://commons.wikimedia.org/wiki/File:Grocery_Store_-_Budhibili_-_Dandadhar_Road_-_Dhenkanal_2018-01-25_9609.JPG",
  },
  {
    group: "personal",
    file: "Tailor Ooty Market Nilgiris Aug25 A7CR 07090.jpg",
    author: "Timothy A. Gonsalves",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:Tailor_Ooty_Market_Nilgiris_Aug25_A7CR_07090.jpg",
  },
  {
    group: "farm",
    file: "Anegundi - Rice Farmers - 1.jpg",
    author: "Ingo Mehling",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:Anegundi_-_Rice_Farmers_-_1.jpg",
  },
  {
    group: "events",
    file: "Bride entering the mandap with her brothers.jpg",
    author: "Wikilover90",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:Bride_entering_the_mandap_with_her_brothers.jpg",
  },
  {
    group: "everyday",
    file: "Streets of Varanasi, 6 April 2019 - 1.jpg",
    author: "Alexey Komarov",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:Streets_of_Varanasi,_6_April_2019_-_1.jpg",
  },
  {
    group: "other",
    file: "Darshan Singh, Village Akbarpur Afghana.jpg",
    author: "Satdeep Gill",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:Darshan_Singh,_Village_Akbarpur_Afghana.jpg",
  },
  {
    group: "auto",
    file: "Auto rickshaw at Hyatt Hyderabad Gachibowli.jpg",
    author: "Wasiul Bahar",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:Auto_rickshaw_at_Hyatt_Hyderabad_Gachibowli.jpg",
  },
  {
    group: "taxi",
    file: "Taxi and laundry Kolkata.jpg",
    author: "Christopher J. Fynn",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:Taxi_and_laundry_Kolkata.jpg",
  },
  {
    group: "bus",
    file: "ISBT Amritsar.jpg",
    author: "Simbu123",
    license: "CC0",
    licenseUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
    page: "https://commons.wikimedia.org/wiki/File:ISBT_Amritsar.jpg",
  },
  {
    group: "goods",
    file: "Truckart in India-Thodupuzha-WUS-06485.jpg",
    author: "Rainer Halama",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:Truckart_in_India-Thodupuzha-WUS-06485.jpg",
  },
  {
    group: "tractor",
    file: "TAFE 240S agra 2026 (DSC2787).jpg",
    author: "MarcelX42",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:TAFE_240S_agra_2026_(DSC2787).jpg",
  },
  {
    group: "bike",
    file: "Hay Motorcycle Harohalli Karnataka Jul24 A7CR 01901.jpg",
    author: "Timothy A. Gonsalves",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:Hay_Motorcycle_Harohalli_Karnataka_Jul24_A7CR_01901.jpg",
  },
  {
    group: "ambulance",
    file: "Ambulance in India.jpg",
    author: "Oleg Yunakov",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:Ambulance_in_India.jpg",
  },
  {
    group: "other_transport",
    file: "Rural Road North Doddegowdana Koppalu Aug24 A7CR 02327.jpg",
    author: "Timothy A. Gonsalves",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:Rural_Road_North_Doddegowdana_Koppalu_Aug24_A7CR_02327.jpg",
  },
];
