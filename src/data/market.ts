export type CommunityStatus='open'|'coming_soon';
export interface Community{id:string;name:string;district:string;city:string;status:CommunityStatus;scene:string;accent:string;description:string}
export interface Product{id:string;community_id:string;title:string;category:string;price:number;originalPrice?:number;condition:string;seller:string;postedAt:string;image:string;source:'邻居发布'|'社区摊位';description:string}
export const communities:Community[]=[
{id:'ciq-jy',name:'次渠嘉园',district:'通州区',city:'北京市',status:'open',scene:'courtyard',accent:'#d47b4d',description:'熟悉的街坊，正在交换好物'},
{id:'ciq-jinyuan',name:'次渠锦园',district:'通州区',city:'北京市',status:'open',scene:'garden',accent:'#78916c',description:'让闲置流动起来，让邻里更亲近'},
{id:'zhongguancun',name:'中关村相关小区',district:'海淀区',city:'北京市',status:'coming_soon',scene:'future',accent:'#8c9db5',description:'待开放 · 暂无真实交易市场'}];
export const products:Product[]=[
{id:'p101',community_id:'ciq-jy',title:'九成新实木小书桌',category:'家具家居',price:120,originalPrice:399,condition:'九成新',seller:'3号楼 王阿姨',postedAt:'今天 09:42',image:'https://images.unsplash.com/photo-1499933374294-4584851497cc?w=900&q=85',source:'邻居发布',description:'搬家腾空间，桌面整洁稳固，适合孩子学习或居家办公。'},
{id:'p102',community_id:'ciq-jy',title:'小熊多功能电饭煲',category:'家用电器',price:65,originalPrice:199,condition:'八成新',seller:'12号楼 小周',postedAt:'今天 08:16',image:'https://images.unsplash.com/photo-1585515320310-259814833e62?w=900&q=85',source:'社区摊位',description:'功能正常，内胆完好，个人自用闲置。'},
{id:'p103',community_id:'ciq-jy',title:'儿童平衡车',category:'母婴玩具',price:45,originalPrice:169,condition:'九成新',seller:'5号楼 邻居',postedAt:'昨天 20:30',image:'https://images.unsplash.com/photo-1594787318286-3d835c1d207f?w=900&q=85',source:'邻居发布',description:'适合2-5岁，轮胎和刹车状态良好。'},
{id:'p104',community_id:'ciq-jy',title:'北欧风落地台灯',category:'家具家居',price:38,condition:'几乎全新',seller:'8号楼 林先生',postedAt:'昨天 18:05',image:'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=900&q=85',source:'邻居发布',description:'暖光护眼，搬家出闲置。'},
{id:'p201',community_id:'ciq-jinyuan',title:'双门小冰箱 126L',category:'家用电器',price:260,originalPrice:899,condition:'八成新',seller:'锦园 6号楼',postedAt:'今天 10:08',image:'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=900&q=85',source:'邻居发布',description:'运行正常，冷藏冷冻都好用，适合出租屋或小家庭。可现场试机。'},
{id:'p202',community_id:'ciq-jinyuan',title:'宜家抽屉收纳柜',category:'家具家居',price:80,originalPrice:249,condition:'九成新',seller:'锦园 2号楼',postedAt:'今天 07:51',image:'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=900&q=85',source:'社区摊位',description:'抽屉顺滑，外观干净，容量很实用。'},
{id:'p203',community_id:'ciq-jinyuan',title:'山地自行车',category:'运动户外',price:180,condition:'八成新',seller:'锦园 9号楼',postedAt:'昨天 19:12',image:'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=900&q=85',source:'邻居发布',description:'日常通勤使用，变速和刹车正常。'}];
export const wants=[{id:'w1',community_id:'ciq-jy',title:'求购一台双门小冰箱',detail:'出租屋使用，预算 300 元以内，功能正常即可',time:'今天 10:12',author:'次渠嘉园邻居'},{id:'w2',community_id:'ciq-jinyuan',title:'收一个儿童餐椅',detail:'希望可折叠，成色干净，价格好商量',time:'今天 09:20',author:'次渠锦园邻居'}];
export const communityById=(id:string)=>communities.find(c=>c.id===id)!;