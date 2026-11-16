import type { Product } from '../data/market';

export interface RoomListing {
  productId: string;
  floor: number;
  room: '客厅' | '书房' | '卧室' | '儿童房' | '厨房' | '阳台';
  anchor: [number, number, number];
  display: 'desk' | 'sofa' | 'fridge' | 'bike' | 'lamp' | 'cabinet' | 'washer';
}

export interface BuildingRecord {
  id: string;
  communityId: string;
  label: string;
  floors: number;
  listings: RoomListing[];
  wants: number;
  position: [number, number, number];
}

export const buildingRecords: BuildingRecord[] = [
  { id: 'jy-3', communityId: 'ciq-jy', label: '3号楼', floors: 6, wants: 2, position: [-8, 0, -1], listings: [
    { productId: 'p101', floor: 3, room: '书房', anchor: [-0.95, 0.15, 0.15], display: 'desk' },
    { productId: 'p104', floor: 3, room: '客厅', anchor: [0.95, 0.05, -0.55], display: 'lamp' },
  ]},
  { id: 'jy-5', communityId: 'ciq-jy', label: '5号楼', floors: 6, wants: 1, position: [0, 0, -2], listings: [
    { productId: 'p103', floor: 2, room: '儿童房', anchor: [0.95, 0.08, -0.45], display: 'bike' },
  ]},
  { id: 'jy-12', communityId: 'ciq-jy', label: '12号楼', floors: 6, wants: 3, position: [8, 0, -1], listings: [
    { productId: 'p102', floor: 4, room: '厨房', anchor: [1.05, 0.08, -0.45], display: 'fridge' },
  ]},
  { id: 'jinyuan-2', communityId: 'ciq-jinyuan', label: '2号楼', floors: 7, wants: 2, position: [-8, 0, -1], listings: [
    { productId: 'p202', floor: 2, room: '卧室', anchor: [0.9, 0.08, -0.5], display: 'cabinet' },
  ]},
  { id: 'jinyuan-6', communityId: 'ciq-jinyuan', label: '6号楼', floors: 7, wants: 4, position: [0, 0, -2], listings: [
    { productId: 'p201', floor: 4, room: '厨房', anchor: [1.05, 0.08, -0.5], display: 'fridge' },
  ]},
  { id: 'jinyuan-9', communityId: 'ciq-jinyuan', label: '9号楼', floors: 7, wants: 1, position: [8, 0, -1], listings: [
    { productId: 'p203', floor: 1, room: '阳台', anchor: [0.9, 0.08, -0.35], display: 'bike' },
  ]},
];

export function listingsForBuilding(buildingId: string, products: Product[]) {
  const building = buildingRecords.find(item => item.id === buildingId);
  if (!building) return [];
  return building.listings.flatMap(listing => {
    const product = products.find(item => item.id === listing.productId);
    return product ? [{ ...listing, product }] : [];
  });
}
