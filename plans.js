/* FindMeCover plan data: the single source for the homepage cards, the homepage
   comparison table and the boiler cover calculator. Add, remove or update plans
   and providers here. Every plan's provider must have an entry in PROVIDERS. */
const PRICES_CHECKED = "31 October 2026";
const PROVIDERS = {
  "HomeServe":   {color:"#d6463a", initial:"HS", rating:4.6, reviews:"181K"},
  "Hometree":    {color:"#2f8a5b", initial:"HT", rating:4.7, reviews:"17.6K"},
  "British Gas": {color:"#2b5fb8", initial:"BG", rating:4.4, reviews:"339K"}
};
const PLANS = [
  {provider:"HomeServe", plan:"Gas Boiler cover", type:"boiler", price:6.49, excess:"£100 excess", service:false,
   deal:"Winter sale to 10 Feb", yr2:"£15.55/mo",
   incl:["Boiler, controls and gas supply pipe","Unlimited claims, parts and labour","New boiler if under 7 years and can't be fixed"],
   url:"https://www.homeserve.co.uk/insurance/boiler-cover-service-xs1"},
  {provider:"HomeServe", plan:"Gas Boiler cover", type:"boiler", price:7.99, excess:"£60 excess", service:false,
   deal:"Winter sale to 10 Feb",
   incl:["Boiler, controls and gas supply pipe","Unlimited claims, parts and labour","Add a boiler service at checkout"],
   url:"https://www.homeserve.co.uk/insurance-cover/gas-and-boiler-comparison"},
  {provider:"HomeServe", plan:"Gas Boiler and Central Heating", type:"heating", price:8.99, excess:"£60 excess", service:false,
   deal:"Winter sale to 10 Feb",
   incl:["Everything in Gas Boiler cover","Radiator leaks and hot water pipes","12-month guarantee on gas repairs"],
   url:"https://www.homeserve.co.uk/insurance/boiler-and-central-heating-cover-service-xs1"},
  {provider:"Hometree", plan:"Your Boiler", type:"boiler", price:12.95, excess:"£0, £60 or £95 call-out", service:true,
   deal:"Up to 25% off to 3 Nov",
   incl:["All gas boilers, any make or age","Unlimited repairs, parts and labour","Renewal capped at inflation if no claims"],
   url:"https://www.hometree.co.uk/products/boiler-cover-insurance/"},
  {provider:"Hometree", plan:"Your Heating", type:"heating", price:null, excess:"£0, £60 or £95 call-out", service:true,
   deal:"Up to 25% off to 3 Nov",
   incl:["Everything in Your Boiler","Radiators, valves and cylinders","Renewal capped at inflation if no claims"],
   url:"https://www.hometree.co.uk/products/boiler-cover-insurance/"},
  {provider:"British Gas", plan:"HomeCare boiler and heating", type:"heating", price:22.00, excess:"£60 excess (£0, £99 too)", service:true,
   incl:["Boiler, controls and central heating","Accidental damage and unlimited repairs","Same-day engineer for 80% who call by 11am"],
   url:"https://www.britishgas.co.uk/cover/boiler-and-heating.html"},
  {provider:"British Gas", plan:"HomeCare boiler only", type:"boiler", price:null, excess:"£0, £60 or £99 excess", service:true,
   incl:["Boiler and controls","Unlimited repairs, parts and labour","Price depends on your postcode and boiler"],
   url:"https://www.britishgas.co.uk/cover/boiler-and-heating.html"}
];
