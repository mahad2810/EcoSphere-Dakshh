import netCDF4 as nc
import numpy as np
try:
    ds1 = nc.Dataset('MarineData/cmems_mod_glo_phy-so_anfc_0.083deg_P1D-m_1765555392031.nc')
    ds2 = nc.Dataset('MarineData/cmems_mod_glo_phy-thetao_anfc_0.083deg_P1D-m_1765555358411.nc')
    print("Time bounds:", ds1.variables['time'][0], "-", ds1.variables['time'][-1], ds1.variables['time'].units)
    print("Depth bounds:", ds1.variables['depth'][0], "-", ds1.variables['depth'][-1])
    lat = ds1.variables['latitude'][:]
    lon = ds1.variables['longitude'][:]
    print("Lat bounds:", np.min(lat), "-", np.max(lat))
    print("Lon bounds:", np.min(lon), "-", np.max(lon))
    so = ds1.variables['so'][:]
    thetao = ds2.variables['thetao'][:]
    print("so range:", np.ma.min(so), "-", np.ma.max(so))
    print("thetao range:", np.ma.min(thetao), "-", np.ma.max(thetao))
except Exception as e:
    print(e)
