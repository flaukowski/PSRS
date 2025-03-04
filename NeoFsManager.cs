using Neo;
using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Attributes;
using Neo.SmartContract.Framework.Native;
using Neo.SmartContract.Framework.Services;
using System;
using System.ComponentModel;
using System.Numerics;

namespace NeoFsStorage
{
    [DisplayName("NeoFsManager")]
    [ManifestExtra("Author", "DecentralizedMusicApp")]
    [ManifestExtra("Description", "Smart contract for managing NEO FS storage payments and permissions")]
    [ContractPermission("*", "onNEP17Payment")]
    public class NeoFsManager : SmartContract
    {
        // Storage keys
        private const string FileUploadPrefix = "file_";
        private const string UserBalancePrefix = "balance_";
        private const string OwnerKey = "owner";

        // Events
        [DisplayName("FileUploaded")]
        public static event Action<UInt160, string, BigInteger> OnFileUploaded;

        [DisplayName("PaymentReceived")]
        public static event Action<UInt160, BigInteger> OnPaymentReceived;

        [DisplayName("StorageWithdrawn")]
        public static event Action<UInt160, BigInteger> OnStorageWithdrawn;

        // Contract owner methods
        public static bool Initialize()
        {
            if (Storage.Get(Storage.CurrentContext, OwnerKey) != null)
                return false;

            Storage.Put(Storage.CurrentContext, OwnerKey, ((Neo.UInt160)Runtime.ExecutingScriptHash).ToArray());
            return true;
        }

        private static bool IsOwner() =>
            Runtime.CheckWitness((UInt160)Storage.Get(Storage.CurrentContext, OwnerKey));

        // File management
        public static bool RegisterFileUpload(UInt160 account, string fileHash, BigInteger size)
        {
            if (!Runtime.CheckWitness(account)) return false;
            
            var storageKey = FileUploadPrefix + fileHash;
            if (Storage.Get(Storage.CurrentContext, storageKey) != null)
                return false;

            // Calculate required GAS (0.001 GAS per MB per day)
            BigInteger requiredGas = size * 1_00000000 / (1024 * 1024);
            var balance = GetBalance(account);
            
            if (balance < requiredGas)
                return false;

            // Deduct from user's balance
            SetBalance(account, balance - requiredGas);
            
            // Store file metadata
            var fileData = new FileData
            {
                Owner = account,
                Size = size,
                Timestamp = Runtime.Time,
                GasPaid = requiredGas
            };
            
            Storage.Put(Storage.CurrentContext, storageKey, StdLib.Serialize(fileData));
            OnFileUploaded(account, fileHash, requiredGas);
            
            return true;
        }

        // Payment handling
        public static bool OnNEP17Payment(UInt160 from, BigInteger amount, object data)
        {
            if (from == null || amount <= 0) return false;

            var currentBalance = GetBalance(from);
            SetBalance(from, currentBalance + amount);
            
            OnPaymentReceived(from, amount);
            return true;
        }

        // Balance management
        private static void SetBalance(UInt160 account, BigInteger value)
        {
            Storage.Put(Storage.CurrentContext, UserBalancePrefix + account.ToArray(), value);
        }

        private static BigInteger GetBalance(UInt160 account)
        {
            byte[] balanceBytes = Storage.Get(Storage.CurrentContext, UserBalancePrefix + account.ToArray());
            if (balanceBytes == null) return 0;
            return (BigInteger)balanceBytes;
        }

        public static BigInteger GetStorageBalance(UInt160 account)
        {
            return GetBalance(account);
        }

        // Withdrawal for contract owner
        public static bool WithdrawStorage(UInt160 to, BigInteger amount)
        {
            if (!IsOwner()) return false;
            if (amount <= 0) return false;

            var token = (Neo.UInt160)GAS.Hash;
            var transfer = (bool)Contract.Call(token, "transfer", CallFlags.All,
                new object[] { Runtime.ExecutingScriptHash, to, amount, null });

            if (transfer)
            {
                OnStorageWithdrawn(to, amount);
                return true;
            }
            return false;
        }

        public class FileData
        {
            public UInt160 Owner;
            public BigInteger Size;
            public uint Timestamp;
            public BigInteger GasPaid;
        }
    }
}
