"""
Cache Structure
{
    service_info: {
        "origin1": {
            ...
        }
    }
    service_data: {
        "origin1": {
            "identity1(uid)": {
                "origin", 
                "uid",
                "key, 
                "fields": {
                    "field1": {
                        "type", 
                        "shared_with": []
                    }, 
                    "field2"
                    ...
                }
            }
        },
        "origin2"
        ...
    },
    foreign_map: [
        {
            "username",
            "uid",
            "field_name"
        }
    ],
    uid_list: {
        "origin1": []
    },
    origin_list: [],
    decrypted_data_file: {
        "origin-uid-field_name"
    }
}
"""
class ParanoidCache:
    def __init__(self):
        self.cache = {
            'service_info' : {},
            'service_data' : {},
            'foreign_map': {},
            'uid_list': {},
            'origin_list': None,
            'decrypted_data_file': {}
        }

    def get_origins(self):
        cache_hit = False
        data = None
        if self.cache['origin_list'] != None:
            data = self.cache['origin_list']
            cache_hit = True
        
        return data, cache_hit
    
    def add_origins(self, origin_list):
        if self.cache['origin_list'] == None:
            self.cache['origin_list'] = []
        for origin in origin_list:
            if origin not in self.cache['origin_list']:
                self.cache['origin_list'].append(origin)
    
    def set_service(self, origin, info_json):
        self.add_origins([origin]) #add origin to cache
        self.cache['service_info'][origin] = info_json
    
    def get_service(self, origin):
        cache_hit = False
        data = None
        if origin in self.cache['service_info']:
            data = self.cache['service_info'][origin]
            cache_hit = True
            
        return data, cache_hit

    def get_service_uids(self, origin):
        cache_hit = False
        data = None
        if origin in self.cache['uid_list']:
            data = self.cache['uid_list'][origin]
            cache_hit = True
        
        return data, cache_hit
    
    def add_service_uids(self, origin, uid_list):
        if origin not in self.cache['uid_list']:
            self.cache['uid_list'][origin] = []
        for uid in uid_list:
            if uid not in self.cache['uid_list'][origin]:
                self.cache['uid_list'][origin].append(uid)

    def set_service_identity(self, origin, uid, identity_json):
        if origin not in self.cache['service_data']:
            self.cache['service_data'][origin] = {}
    
        self.add_service_uids(origin, [uid]) #add uid to uid list
        self.cache['service_data'][origin][uid] = identity_json 

    def get_service_identity(self, origin, uid):
        cache_hit = False
        data = None
        if origin in self.cache['service_data'] and uid in self.cache['service_data'][origin]:
            data = self.cache['service_data'][origin][uid]
            cache_hit = True
            
        return data, cache_hit

    def set_foreign_map(self, origin, foreign_map_json):
        self.cache['foreign_map'][origin] = foreign_map_json

    def get_foreign_map(self, origin):
        cache_hit = False
        data = None
        if origin in self.cache['foreign_map']:
            data = self.cache['foreign_map'][origin]
            cache_hit = True
            
        return data, cache_hit

    def decrypt_data_file(self, origin, uid, field_name):
        key = "{}-{}-{}".format(origin, uid, field_name)
        cache_hit = False
        data = None
        if key in self.cache['decrypted_data_file']:
            data = self.cache['decrypted_data_file'][key]
            cache_hit = True
            
        return data, cache_hit
    
    def encrypt_data_file(self, origin, uid, field_name, data):
        key = "{}-{}-{}".format(origin, uid, field_name)
        self.cache['decrypted_data_file'][key] = data